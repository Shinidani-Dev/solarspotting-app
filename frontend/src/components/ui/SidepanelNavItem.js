import Link from "next/link";

export default function SidepanelNavItem({itemName, link, isActive, Icon}) {

    let activeClass = isActive ? "bg-slate-700 text-amber-400" : "text-slate-300 hover:bg-slate-700 hover:text-amber-300";

    return (
        <li key={itemName}>
            <Link href={link} className={`flex items-center px-4 py-2 rounded-md ${activeClass}`}>
            {Icon && <Icon className="mr-3" size={18}/>}
            <span>{itemName}</span>
            </Link>
        </li>
    );
}