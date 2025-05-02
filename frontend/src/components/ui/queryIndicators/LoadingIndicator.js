export default function LoadingIndicator() {
    return (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="w-12 h-12 border-t-2 border-b-2 rounded-full animate-spin border-amber-500"></div>
        </div>
      );
}