import Image from "next/image";
import Link from "next/link";
import { BRAND, WEEKLY_SPECIALS } from "@/lib/brand";
import { getMenu, getSettings } from "@/lib/data";
import { Logo } from "@/components/site/Logo";
import { Marquee } from "@/components/site/Marquee";
import { SectionTitle } from "@/components/site/SectionTitle";
import { ButtonLink } from "@/components/ui/Button";
import { FeaturedGrid } from "@/components/menu/FeaturedGrid";
import { FoodArt } from "@/components/menu/FoodArt";

const marquee = ["Asian · Caribbean Fusion", "Order online", "Next to AXA Airport", "Wingman Wednesday", "First Class Mondays", "Thirsty Thursday", "Made for your cravings"];

export default async function HomePage() {
  const [{ items }, settings] = await Promise.all([getMenu(), getSettings()]);
  const featured = items.filter((i) => i.featured).slice(0, 6);
  const today = settings.hours[(new Date().getDay() + 6) % 7];

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-6 pt-10 pb-16 sm:pt-14">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div className="order-2 md:order-1 text-center md:text-left">
              <p className="brand text-sm uppercase tracking-[0.3em] text-orange">Today {today?.closed ? "· Closed" : `${today?.open ?? "11:00"} – ${today?.close ?? "22:00"}`}</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-widest text-ink/70 leading-relaxed">Made for your cravings.<br />Hot, fresh, right when you want it.</p>
              <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                <ButtonLink href="/menu" size="lg">Order now</ButtonLink>
                <ButtonLink href="#specials" variant="outline" size="lg">Weekly specials</ButtonLink>
              </div>
            </div>
            <div className="order-1 md:order-2 relative mx-auto w-[min(78vw,420px)]">
              <span className="absolute -left-10 top-10 brand text-xs uppercase tracking-[0.3em] text-orange rotate-[-8deg] hidden sm:block">Fresh</span>
              <span className="absolute -right-12 top-24 brand text-xs uppercase tracking-[0.3em] text-orange rotate-[6deg] hidden sm:block">✈️ Next to AXA</span>
              <span className="absolute -left-14 bottom-24 brand text-xs uppercase tracking-[0.3em] text-orange rotate-[6deg] hidden sm:block">Flavorful</span>
              <div className="animate-float">
                <Logo priority className="w-full drop-shadow-[0_24px_40px_rgba(217,90,0,0.25)]" />
              </div>
            </div>
            <div className="order-3 text-center md:text-right">
              <a href={`tel:${BRAND.phoneE164}`} className="brand text-lg text-orange hover:text-orange-bright">{BRAND.phoneDisplay}</a>
              <p className="mt-1 text-sm font-bold uppercase tracking-widest text-ink/70">{BRAND.address.line1}<br />{BRAND.address.village}, {BRAND.address.island}</p>
              <p className="script mt-3 text-2xl text-charcoal">by {BRAND.chef}</p>
            </div>
          </div>
          <h1 className="display mx-auto mt-14 max-w-5xl text-center text-5xl leading-[0.95] text-charcoal sm:text-7xl md:text-8xl">
            Crafted <span className="text-orange">fresh</span> daily with <span className="text-orange">bold</span> Asian flavor &amp; <span className="brush text-cream">Caribbean</span> soul
          </h1>
        </div>
        <Marquee items={marquee} />
      </section>

      {/* ---------- HOW ORDERING WORKS ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Pick your plate", d: "Browse the menu, choose your sauce, your base, your spice. Add it to your order in a tap." },
            { n: "02", t: "We start cooking", d: "The kitchen gets your order the second you send it. No phone tag, no waiting on hold." },
            { n: "03", t: "Get the WhatsApp", d: "The moment it's ready you get a WhatsApp and an email. Smooth landing, every time." },
          ].map((s) => (
            <div key={s.n} className="rounded-[1.6rem] border-2 border-charcoal bg-offwhite p-6 shadow-[6px_6px_0_0_#d95a00]">
              <span className="display text-5xl text-orange">{s.n}</span>
              <h3 className="brand mt-2 text-xl">{s.t}</h3>
              <p className="mt-1 text-ink/70">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- WHAT WE SERVE ---------- */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <SectionTitle kicker="What" title="We serve" subtitle="Born from two coasts. One bowl at a time." />
        <div className="mt-12 grid grid-cols-2 auto-rows-[170px] gap-4 md:grid-cols-4 md:auto-rows-[230px]">
          <Link href="/menu#sushi" className="group relative overflow-hidden rounded-[1.4rem] border-2 border-charcoal md:row-span-2">
            <Image src="/menu/sushi.jpg" alt="Dragon roll" fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 to-transparent p-4 pt-12 display text-4xl text-cream">Sushi</span>
          </Link>
          <div className="relative flex items-center justify-center overflow-hidden rounded-[1.4rem] border-2 border-charcoal bg-orange text-cream p-4 text-center">
            <div className="grain absolute inset-0" />
            <div className="relative">
              <p className="brand text-3xl">Route 86</p>
              <p className="text-[10px] uppercase tracking-[0.3em]">Flavours of two worlds</p>
            </div>
          </div>
          <Link href="/menu#bowls" className="group relative overflow-hidden rounded-[1.4rem] border-2 border-charcoal">
            <Image src="/menu/poke.jpg" alt="Ahi tuna poke bowl" fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 to-transparent p-4 pt-12 display text-3xl text-cream">Poke bowls</span>
          </Link>
          <Link href="/menu#wings" className="group relative overflow-hidden rounded-[1.4rem] border-2 border-charcoal md:row-span-2">
            <Image src="/menu/wings.jpg" alt="Route 86 wings" fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 to-transparent p-4 pt-12 display text-4xl text-cream">Wings</span>
          </Link>
          <Link href="/menu#noodles" className="relative overflow-hidden rounded-[1.4rem] border-2 border-charcoal">
            <FoodArt word="Ramen" tone="dark" className="absolute inset-0" />
            <span className="absolute inset-x-0 bottom-0 p-4 display text-3xl text-cream">Noodles</span>
          </Link>
          <Link href="/menu#mains" className="group relative overflow-hidden rounded-[1.4rem] border-2 border-charcoal">
            <Image src="/menu/fried_rice.jpg" alt="House fried rice" fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 to-transparent p-4 pt-12 display text-3xl text-cream">Rice &amp; mains</span>
          </Link>
        </div>
      </section>

      {/* ---------- FAVORITES ---------- */}
      <section className="bg-sand py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle kicker="Customers'" title="Favorites" subtitle="The plates people fly back for." />
          <div className="mt-12">
            <FeaturedGrid items={featured} />
          </div>
          <div className="mt-10 text-center">
            <ButtonLink href="/menu" variant="dark" size="lg">☰ Full menu</ButtonLink>
          </div>
        </div>
      </section>

      {/* ---------- SPECIALS ---------- */}
      <section id="specials" className="relative bg-charcoal py-20 text-cream overflow-hidden scroll-mt-20">
        <div className="grain absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-6">
          <SectionTitle light kicker="Every week" title="Weekly specials" subtitle="Same runway, different flight every day." />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {WEEKLY_SPECIALS.map((s) => (
              <article key={s.slug} className="group relative overflow-hidden rounded-[1.6rem] border-2 border-orange bg-ink shadow-[6px_6px_0_0_#d95a00]">
                <div className="relative aspect-[4/3]">
                  <Image src={s.image} alt={s.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full bg-orange px-3 py-1 text-xs font-black uppercase tracking-widest text-white">{s.day}</span>
                </div>
                <div className="p-6">
                  <p className="script text-2xl text-orange-bright">{s.kicker}</p>
                  <h3 className="display text-4xl">{s.title}</h3>
                  <p className="mt-1 font-bold text-cream">{s.deal}</p>
                  <p className="mt-2 text-sm text-cream/70">{s.blurb}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-xs uppercase tracking-widest text-cream/50">Specials are applied in store. Ask your server or mention it in your order notes.</p>
        </div>
      </section>

      {/* ---------- ABOUT ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-20 grid items-center gap-10 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] border-2 border-charcoal shadow-[8px_8px_0_0_#d95a00]">
          <Image src="/menu/poke.jpg" alt="Ahi tuna poke bowl from Route 86" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
        </div>
        <div>
          <p className="brand text-sm uppercase tracking-[0.3em] text-orange">Our story</p>
          <h2 className="display mt-2 text-5xl sm:text-6xl text-charcoal">Born next to the runway</h2>
          <p className="mt-5 text-lg text-ink/80">
            Route 86 sits on George Hill Main Road, right beside Anguilla&apos;s airport. {BRAND.chef} pairs bold Asian technique with
            Caribbean soul: jerk in the gyoza, curry goat in the ramen, scotch bonnet in the sushi. Hand-rolled, wok-tossed, and
            served with good vibes.
          </p>
          <blockquote className="mt-6 rounded-[1.4rem] border-l-4 border-orange bg-offwhite p-5 text-ink/80 italic">
            “We are beyond grateful for your love, support and loyalty over the past year. You are the reason we do what we do!”
            <footer className="mt-2 not-italic brand text-sm text-orange">— The Route 86 team</footer>
          </blockquote>
        </div>
      </section>

      {/* ---------- CTA BAND ---------- */}
      <section className="relative bg-orange text-white py-16 overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="script text-4xl">When did you last eat something that made you stop?</p>
          <p className="mt-4 text-white/90">That&apos;s what we cook for. Not fast food. Not trends. Two cultures worth of technique, tradition and obsession, served hot, made fresh, every single day. Your order is one tap away.</p>
          <ButtonLink href="/menu" variant="cream" size="lg" className="mt-8">Order now</ButtonLink>
        </div>
      </section>

      {/* ---------- VISIT ---------- */}
      <section id="visit" className="mx-auto max-w-7xl px-6 py-20 scroll-mt-20">
        <SectionTitle kicker="Find us" title="Visit Route 86" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-[1.6rem] border-2 border-charcoal bg-offwhite p-6">
            <p className="brand text-sm uppercase tracking-widest text-orange">Where</p>
            <p className="mt-2 text-lg font-bold">{BRAND.address.line1}</p>
            <p className="text-ink/70">{BRAND.address.line2}</p>
            <p className="text-ink/70">{BRAND.address.village}, {BRAND.address.island}</p>
            <a href={BRAND.address.mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-black uppercase tracking-widest text-orange">Open in maps →</a>
          </div>
          <div className="rounded-[1.6rem] border-2 border-charcoal bg-offwhite p-6">
            <p className="brand text-sm uppercase tracking-widest text-orange">Hours</p>
            <ul className="mt-2 space-y-1 text-sm">
              {settings.hours.map((h) => (
                <li key={h.day} className="flex justify-between"><span className="font-bold">{h.day}</span><span className="text-ink/70">{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.6rem] border-2 border-charcoal bg-charcoal text-cream p-6">
            <p className="brand text-sm uppercase tracking-widest text-orange-bright">Talk to us</p>
            <a href={`tel:${BRAND.phoneE164}`} className="mt-2 block text-2xl brand">{BRAND.phoneDisplay}</a>
            <a href={`https://wa.me/${BRAND.whatsappE164.replace("+", "")}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-black uppercase tracking-widest text-white">WhatsApp us</a>
            <p className="mt-4 text-sm text-cream/70">@{BRAND.instagram} on Instagram &amp; Facebook</p>
          </div>
        </div>
      </section>
      <Marquee items={["Yummy", "Route 86", "Asian · Caribbean Fusion", "Anguilla"]} dark />
    </>
  );
}
