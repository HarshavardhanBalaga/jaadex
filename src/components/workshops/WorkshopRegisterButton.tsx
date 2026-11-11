import Link from "next/link";

/** "Register now" for an upcoming workshop with registration open. Opens the workshop's own register page. */
export function WorkshopRegisterButton({ workshopId }: { workshopId: string }) {
  return (
    <Link
      href={`/workshops/${workshopId}/register`}
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[10px] text-center text-[15px] font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange motion-reduce:transition-none"
    >
      Register now ↗
    </Link>
  );
}
