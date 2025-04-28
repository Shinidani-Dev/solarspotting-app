
export default function CardWrapper({children}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children}
        </div>
    );
}