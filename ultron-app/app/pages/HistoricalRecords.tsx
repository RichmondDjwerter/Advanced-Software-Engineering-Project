"use client"
import { useEffect, useState } from "react"
import { getHistoricalRecords } from "@/lib/api"

export default function HistoricalRecords() {
  const [data, setData] = useState(null)

  useEffect(() => {
    getHistoricalRecords().then(setData)
  }, [])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col gap-8 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Historical Records</h1>

        <div>
          <h2 className="text-base font-semibold text-black dark:text-white mb-2">Data</h2>
          <pre className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded p-4 text-sm text-black dark:text-zinc-100 overflow-auto">
            {data ? JSON.stringify(data, null, 2) : "Loading..."}
          </pre>
        </div>

        <div>
          <h2 className="text-base font-semibold text-black dark:text-white mb-2">Upload</h2>
          <label className="flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-black dark:bg-white px-5 text-sm font-medium text-white dark:text-black cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
            <input type="file" className="hidden" />
            Upload File
          </label>
        </div>
      </main>
    </div>
  )
}
