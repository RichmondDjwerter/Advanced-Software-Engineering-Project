// imports
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";
import { DeleteButton } from "@/app/components/DeleteButton";

// Props the component gets from outside
type Props = {
    id: string;
    name: string;
    description: string | null;

}
// Function: Component itself
export function RecordCard({ id, name, description}: Props){
    const extensionIndex = name.lastIndexOf(".");
    const hasExtension = extensionIndex > 0;
    const baseName = hasExtension ? name.slice(0, extensionIndex) : name;
    const extension = hasExtension ? name.slice(extensionIndex) : "";

    return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex min-w-0 pr-2" title={name}>
                        <span className="min-w-0 truncate">{baseName}</span>
                        {extension && <span className="shrink-0">{extension}</span>}
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                    <CardAction className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                        <Link
                            href={`/historical-records/${id}`}
                            className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                            View Document
                        </Link>
                        <DeleteButton id={id} redirectUrl="/historical-records" />
                    </CardAction>
                </CardHeader>
                <ImageWithZoom key={`${id}-${name}`} id={id} name={name} />
            </Card>
    )
}
