"use client"
import { useEffect, useState } from "react"
import { getHistoricalRecords } from "@/app/lib/api"

export default function HistoricalRecords() {
  const [data, setData] = useState(null)

  useEffect(() => {
    getHistoricalRecords().then(setData)
  }, [])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col gap-8 py-32 px-16 bg-white sm:items-start">
        <h1 className="text-3xl font-semibold tracking-tight text-black">Historical Records</h1>

        <div>
          <h2 className="text-base font-semibold text-black mb-2">Data</h2>
          <pre className="bg-zinc-100 border rounded p-4 text-sm text-black overflow-auto">
            {data ? JSON.stringify(data, null, 2) : "Loading..."}
          </pre>
        </div>

        <div>
          <h2 className="text-base font-semibold text-black mb-2">Upload</h2>
          <label className="flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white cursor-pointer hover:bg-zinc-800 transition-colors">
            <input type="file" className="hidden" />
            Upload File
          </label>
        </div>
      </main>
    </div>
  )
}
