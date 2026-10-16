// imports
import Link from "next/link";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";

// Props the component gets from outside
type Props = {
    id: string;
    name: string;
    description: string | null;
    imageFilename: string | null;

}
// Function: Component itself
export function RecordCard({ id, name, description, imageFilename }: Props) {
    return (
            <Card>
                <CardHeader>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                    <CardAction>
                        <Link
                            href={`/historical-records/${id}`}
                            className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                            View Document
                        </Link>
                    </CardAction>
                </CardHeader>
                <ImageWithZoom name={name} />
            </Card>
    )
}
