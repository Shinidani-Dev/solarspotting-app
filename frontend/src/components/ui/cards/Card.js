export default function Card({children}) {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            {children}
        </div>
    );

}