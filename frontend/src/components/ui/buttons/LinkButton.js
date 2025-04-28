import Link from "next/link";

export default function LinkButton({text, link, Icon}) {
    return (
        <Link href={link} className="inline-flex items-center px-4 py-2 mt-4 bg-amber-500 text-slate-900 hover:bg-amber-400 rounded-md font-medium">
            {Icon && <Icon className="mr-3" size={18}/>}
            <span>{text}</span>
        </Link>
    );
}