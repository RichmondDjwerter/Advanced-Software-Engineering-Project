// imports
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";


// Props the component gets from outside
type Props = {
    id: string;
    name: string;
    description: string | null;

}
// Function: Component itself
export function RecordCard({ id, name, description}: Props){
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
                <CardContent>
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        Image will go here
                    </div>
                </CardContent>
            </Card>
    )
}
