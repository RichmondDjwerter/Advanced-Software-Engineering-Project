import Link from "next/link";
import { LanguagesIcon, MessagesSquareIcon, UploadIcon } from "lucide-react";
import { UploadButton } from "./components/UploadButton";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: UploadIcon,
    title: "Upload",
    description: "Upload historical documents for analysis.",
  },
  {
    icon: LanguagesIcon,
    title: "Translate",
    description: "Translate the content of your documents.",
  },
  {
    icon: MessagesSquareIcon,
    title: "Ask",
    description: "Ask questions about the content of a document.",
  },
];

export default function Home() {
  return (
    <div
      data-page="home"
      className="flex flex-1 flex-col items-center gap-10 pt-12 text-center"
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">
          Historical Documents
        </p>
        <h1 className="max-w-2xl font-heading text-4xl font-medium tracking-tight text-balance">
          Explore, analyse and understand historical records
        </h1>
        <p className="max-w-xl text-muted-foreground text-pretty">
          Ultron is a tool for working with historical documents. Upload a
          document, translate its content and ask questions about the document
          using the integrated assistant.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <UploadButton />
        <Link
          href="/historical-records"
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          View Historical Records
        </Link>
      </div>

      <div className="-mb-8 flex w-full flex-1 flex-col">
        <Separator className="self-center data-horizontal:w-screen" />

        <div className="flex w-screen flex-1 flex-col self-center py-10 sm:flex-row">
          {features.map((feature, index) => (
            <div key={feature.title} className="contents">
              {index > 0 && (
                <Separator orientation="vertical" className="hidden sm:block" />
              )}
              <div className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-3 px-4 py-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-coral/15 text-coral">
                  <feature.icon className="size-5" />
                </div>
                <h2 className="font-heading text-base font-medium">
                  {feature.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
