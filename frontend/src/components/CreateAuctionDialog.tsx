import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'

const schema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(500),
  imageUrl: z.string().url(),
  category: z.string().min(2).max(40),
  durationSecs: z.number().int().positive().max(60 * 60 * 24 * 14),
  minBid: z.number().positive(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onCreate: (values: FormData) => Promise<void>
  disabled?: boolean
}

export default function CreateAuctionDialog({ onCreate, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      category: 'Electronics',
      durationSecs: 3600,
      minBid: 10,
    },
  })

  const onSubmit = async (data: FormData) => {
    await onCreate(data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="!rounded-2xl">Create Auction</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Auction</DialogTitle>
          <DialogDescription>Deploy a new live auction on Stellar Testnet.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 mt-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <input className="saas-input" placeholder="Title" {...register('title')} />
            {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <textarea className="saas-input" placeholder="Description" rows={3} {...register('description')} />
            {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <input className="saas-input" placeholder="Image URL" {...register('imageUrl')} />
            {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <select className="saas-input" {...register('category')}>
                {['Digital Art','Real Estate','Collectibles','Luxury Goods','Electronics'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-400 text-xs">{errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <input className="saas-input" type="number" placeholder="Duration (secs)" {...register('durationSecs', { valueAsNumber: true })} />
              {errors.durationSecs && <p className="text-red-400 text-xs">{errors.durationSecs.message}</p>}
            </div>
            <div className="space-y-2">
              <input className="saas-input" type="number" placeholder="Min Bid (XLM)" {...register('minBid', { valueAsNumber: true })} />
              {errors.minBid && <p className="text-red-400 text-xs">{errors.minBid.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="!rounded-2xl">{isSubmitting ? 'Submitting…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
