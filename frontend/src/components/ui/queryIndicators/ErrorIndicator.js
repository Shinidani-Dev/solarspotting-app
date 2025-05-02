export default function ErrorIndicator({error}) {
    return (
        <div className="p-4 border-l-4 border-red-500 rounded-md bg-red-500/10">
          <p className="text-red-400">{error}</p>
        </div>
      );}