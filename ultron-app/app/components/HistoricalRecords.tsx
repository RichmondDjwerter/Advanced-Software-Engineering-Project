"use client";

import {useCallback, useEffect, useState} from "react";
import {RecordCard} from "@/app/components/RecordCard";
import {UploadButton} from "@/app/components/UploadButton";
import {HistoricalRecord} from "@/app/types/historicalRecord";

export default function HistoricalRecords() {
    const [records, setRecords] = useState<HistoricalRecord[]>([]);

    const loadRecords = useCallback(async () => {
        const response = await fetch("/api/historicalRecords");

        if (!response.ok) {
            throw new Error("Failed to load historical records");
        }

        setRecords(await response.json());
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function fetchRecords() {
            try {
                const response = await fetch("/api/historicalRecords");

                if (!response.ok) {
                    throw new Error("Failed to load historical records");
                }

                const data: HistoricalRecord[] = await response.json();

                if (!cancelled) {
                    setRecords(data);
                }
            } catch (error) {
                console.error(error);
            }
        }

        fetchRecords();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h1 className="font-heading text-2xl font-medium tracking-tight">
                        Historical Records
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Browse your uploaded documents and open one to work with it.
                    </p>
                </div>

                <UploadButton onUploadSuccess={loadRecords}/>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {records.length === 0 ? (
                    <div
                        className="col-span-full flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center shadow-sm">
                        <p className="text-base font-medium text-foreground">
                            No historical records found
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Please upload an image to get started.
                        </p>
                    </div>
                ) : (
                    records.map((record) => (
                        <RecordCard
                            key={record.id}
                            id={String(record.id)}
                            name={record.name}
                            description={record.description}
                        />
                    ))
                )}
            </div>
        </>
    );
}
