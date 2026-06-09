"use client"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

export const OrderSkeleton = () => {
  return (
    <div className="rounded-md space-y-300">
        <Skeleton.Rectangle className="h-8 rounded-sm" />
        <div className="bg-surface rounded-md p-400">
            <Skeleton.Text noOfLines={2} containerClassName="w-64"/>
            <div className="grid grid-cols-2 py-500 gap-600">
                <Skeleton.Text noOfLines={4} containerClassName="w-full space-y-100"/>
                <Skeleton.Text noOfLines={4} containerClassName="w-full space-y-100"/>
            </div>
            <div className="grid grid-cols-2 py-500 gap-600">
                <Skeleton.Text noOfLines={4} containerClassName="w-40" />
                <Skeleton.Text noOfLines={4} containerClassName="w-40" />
            </div>
                <Skeleton.Text noOfLines={4} />
        </div>
        <div className="bg-surface h-32 rounded-md p-400 space-y-200">
            <Skeleton.Text noOfLines={1} containerClassName="w-46" className="min-h-6"/>
            <Skeleton.Text noOfLines={3} />
        </div>
    </div>
    );
}