import Link from "next/link";
import { Brand } from "./Brand";
import { Container } from "./Container";
import { navigation } from "@/lib/site";

const columnTitle = "mt-[5px] mb-[15px] text-[13px] font-bold text-[#ffffff]";
const columnLink = "my-[11px] block text-[13px] text-[#aebbe0] hover:text-gold";

export function Footer() {
  return (
    <footer className="bg-[#031552] pt-[43px] pb-5 text-[#cfd9f5]">
      <Container>
        <div className="grid grid-cols-2 gap-[18px] pb-[30px] min-[401px]:gap-7 md:grid-cols-[1.4fr_1fr_1fr] lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-full md:col-auto">
            <Brand footer />
            <p className="mt-[15px] max-w-[290px] text-[13px] leading-[1.7] text-[#aebbe0]">
              JaaDeX brings education, animation, storytelling and creative technology together to help learners imagine, create and share.
            </p>
          </div>
          <div>
            <h2 className={columnTitle}>Explore</h2>
            {navigation.map((item) => <Link className={columnLink} href={item.href} key={item.href}>{item.label}</Link>)}
          </div>
          <div>
            <h2 className={columnTitle}>Our work</h2>
            <Link className={columnLink} href="/schools">School Animation Learning</Link>
            <Link className={columnLink} href="/projects">Creative Projects</Link>
            <Link className={columnLink} href="/workshops">Workshops</Link>
          </div>
          <div className="hidden max-md:block lg:block">
            <h2 className={columnTitle}>Connect</h2>
            <Link className={columnLink} href="/contact?interest=School%20Packages">School Enquiries</Link>
            <Link className={columnLink} href="/contact?interest=Partnership%20or%20Collaboration">Partnerships</Link>
            <Link className={columnLink} href="/contact">Contact JaaDeX</Link>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-[15px] border-t border-white/10 pt-[18px] text-[11px] text-[#8d9cc9] max-md:flex-col max-md:gap-0 max-md:leading-8">
          <span>© {new Date().getFullYear()} JaaDeX Innovision Pvt Ltd. All rights reserved.</span>
          <span>Imagine. Create. Animate. 🌱</span>
        </div>
      </Container>
    </footer>
  );
}
