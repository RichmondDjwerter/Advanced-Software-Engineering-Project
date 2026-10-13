// imports
import Link from "next/link";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";

// Props the component gets from outside
type Props = {
    id: string;
    name: string;
    description: string | null;

}
// Function: Component itself
export function RecordCard({ id, name, description}: Props){
    const [imageNotFound, setImageNotFound] = useState(false);
    const [imageZoomed, setImageZoomed] = useState(false);

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
