export default function Card({children, ...props}) {
    return (
        <div className="p-6 border rounded-lg bg-slate-800 border-slate-700" {...props}>
            {children}
        </div>
    );

}