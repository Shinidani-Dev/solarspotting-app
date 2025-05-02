
export default function CardWrapper({children, ...props}) {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2" {...props}>
            {children}
        </div>
    );
}