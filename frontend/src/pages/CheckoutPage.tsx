import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { addressApi, ordersApi, paymentsApi } from '../api/services'
import { errorMessage } from '../api/client'
import type { Order } from '../api/types'
import { PageHeader } from '../components/common/PageHeader'
import { Button, Card, Checkbox, EmptyState, ErrorState, Input, Skeleton, useToast } from '../components/ui'
import { addressSchema, type AddressForm } from '../lib/schemas'
import { Row, useCart } from './CartPage'

const METHODS: [string, string][] = [['UPI', 'UPI'], ['CREDIT_CARD', 'Credit card'], ['DEBIT_CARD', 'Debit card'], ['NET_BANKING', 'Net banking'], ['COD', 'Cash on delivery']]

function Steps({ current }: { current: number }) {
  const steps = ['Address', 'Payment', 'Confirmation']
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Checkout progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i < current ? 'bg-success text-white' : i === current ? 'bg-accent text-accent-fg' : 'bg-subtle text-muted'}`}>{i < current ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}</span>
          <span className={i === current ? 'font-medium' : 'text-muted'}>{s}</span>{i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
        </li>))}
    </ol>)
}

export function CheckoutPage() {
  const cart = useCart(); const qc = useQueryClient(); const nav = useNavigate(); const toast = useToast()
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: addressApi.list })
  const [addressId, setAddressId] = useState<number | null>(null)
  const selected = addressId ?? addresses.data?.find(a => a.defaultAddress)?.id ?? addresses.data?.[0]?.id ?? null
  const [method, setMethod] = useState('UPI'); const [simulateFail, setSimulateFail] = useState(false)
  // One idempotency key per checkout attempt: a double click or network retry can never create a second order or charge.
  const orderKey = useRef(crypto.randomUUID()); const payKey = useRef(crypto.randomUUID())
  const [order, setOrder] = useState<Order | null>(null); const [failure, setFailure] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({ resolver: zodResolver(addressSchema) })
  const addAddress = useMutation({
    mutationFn: (v: AddressForm) => addressApi.create({ ...v, country: 'India', makeDefault: true }),
    onSuccess: a => { setAddressId(a.id); reset(); qc.invalidateQueries({ queryKey: ['addresses'] }) }, onError: e => toast('err', errorMessage(e)),
  })
  const place = useMutation({
    mutationFn: async () => {
      const o = order ?? await ordersApi.place(selected, orderKey.current)
      setOrder(o)
      const p = await paymentsApi.pay(o.id, method, import.meta.env.DEV && simulateFail ? 'FAILURE' : 'SUCCESS', payKey.current)
      return { o, p }
    },
    onSuccess: ({ o, p }) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      if (p.status === 'FAILED') { setFailure(p.failureReason ?? 'Payment failed'); payKey.current = crypto.randomUUID(); return }   // fresh key for the next attempt
      nav(`/orders/${o.id}`, { state: { placed: true, cod: method === 'COD' } })
    },
    onError: e => toast('err', errorMessage(e)),
  })

  if (cart.isLoading || addresses.isLoading) return <Skeleton className="h-80 w-full" />
  if (cart.isError) return <ErrorState message={errorMessage(cart.error)} onRetry={() => cart.refetch()} />
  if (!order && !cart.data!.items.length) return <EmptyState title="Nothing to check out" hint="Add products to your cart first." />

  return (
    <div>
      <PageHeader title="Checkout" />
      <Steps current={order ? 1 : selected ? 1 : 0} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Delivery address</h2>
            <div role="radiogroup" aria-label="Delivery address" className="space-y-2">
              {addresses.data!.map(a => (
                <label key={a.id} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input type="radio" name="address" disabled={!!order} checked={selected === a.id} onChange={() => setAddressId(a.id)} />
                  <span><b>{a.fullName}</b>, {a.line1}, {a.city}, {a.state} {a.postalCode} · {a.phone}</span>
                </label>))}
            </div>
            {!order && <form onSubmit={handleSubmit(v => addAddress.mutate(v))} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
              <p className="text-sm font-medium sm:col-span-2">{addresses.data!.length ? 'Add another address' : 'Add a delivery address'}</p>
              <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} /><Input label="Phone" error={errors.phone?.message} {...register('phone')} />
              <div className="sm:col-span-2"><Input label="Address line" error={errors.line1?.message} {...register('line1')} /></div>
              <Input label="City" error={errors.city?.message} {...register('city')} /><Input label="State" error={errors.state?.message} {...register('state')} />
              <Input label="Postal code" error={errors.postalCode?.message} {...register('postalCode')} />
              <div className="flex items-end"><Button type="submit" variant="secondary" loading={addAddress.isPending}>Save address</Button></div>
            </form>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Payment method</h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">{METHODS.map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} />{l}</label>))}</div>
            <p className="mt-3 text-xs text-muted">Payments are simulated. No card data is collected or stored.</p>
            {import.meta.env.DEV && <div className="mt-2"><Checkbox label="Simulate a failed payment (dev only)" checked={simulateFail} onChange={e => setSimulateFail(e.target.checked)} /></div>}
          </Card>
          {failure && <ErrorState message={`${failure}. Your items stay reserved for a short time; you can retry.`} />}
        </div>
        <Card className="h-fit space-y-2 p-5 text-sm">
          <h2 className="mb-1 font-semibold">Summary</h2>
          {order ? <><Row k="Order total" v={order.total} bold /><p className="text-xs text-muted">Order {order.orderNumber} is awaiting payment.</p></>
            : <><Row k="Subtotal" v={cart.data!.totals.subtotal} /><Row k="Discount" v={-cart.data!.totals.discount} /><Row k="Tax" v={cart.data!.totals.tax} />
                <Row k="Shipping" v={cart.data!.totals.shipping} /><div className="border-t border-line pt-2"><Row k="Total" v={cart.data!.totals.total} bold /></div></>}
          <Button className="mt-2 w-full" loading={place.isPending} disabled={!selected} onClick={() => { setFailure(null); place.mutate() }}>{order ? 'Retry payment' : method === 'COD' ? 'Place order' : 'Pay now'}</Button>
          {!selected && <p className="text-xs text-muted">Add a delivery address to continue.</p>}
        </Card>
      </div>
    </div>)
}
