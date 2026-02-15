
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#B45309] rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
                H
              </div>
              <span className="text-xl sm:text-2xl font-bold text-[#2A2A2A] tracking-tight font-serif">HomeInTown</span>
              </Link>
            </div>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-[#2A2A2A] text-white text-sm sm:text-base font-medium rounded-lg hover:bg-black transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-32 pb-16 sm:pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center ">
          <div className="inline-block px-4 py-1.5 bg-[#E7E5E4] rounded-full text-[#57534E] text-xs sm:text-sm font-semibold uppercase tracking-wider mb-6">
            Real Estate Sales Solution
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-[#2A2A2A] mb-6 leading-tight font-serif">
            Sell Projects Faster with<br />
            <span className="text-[#B45309]">Dynamic Websites</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#57534E] mb-10 max-w-xl mx-auto leading-relaxed">
            Create professional, mobile-ready property landing pages in minutes. 
            No coding required. Just results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/projects/new"
              className="px-8 py-4 bg-[#B45309] text-white font-semibold rounded-lg hover:bg-[#92400E] transition-colors shadow-sm text-base"
            >
              Create New Project
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-[#2A2A2A] font-semibold rounded-lg border border-[#D6D3D1] hover:bg-[#F5F5F4] transition-colors text-base"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 bg-white border-y border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-4 font-serif">
              Built for Real Estate
            </h2>
            <p className="text-[#78716C] max-w-2xl mx-auto">Everything you need to showcase your property professionally.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Simple Setup',
                description: 'Add project details, pricing, and images in a simple form. Flats or Plots supported.',
                icon: '📝',
              },
              {
                title: 'Instant Website',
                description: 'Get a shareable, premium-looking link immediately after publishing.',
                icon: '⚡',
              },
              {
                title: 'Verified Trust',
                description: 'Built-in RERA compliance badges and standardized layout for buyer trust.',
                icon: '🛡️',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-[#FAF7F2] rounded-xl border border-[#E7E5E4] hover:border-[#D6D3D1] transition-colors"
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-[#E7E5E4] shadow-sm mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[#2A2A2A] mb-3 font-serif">
                  {feature.title}
                </h3>
                <p className="text-[#57534E] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 sm:py-24 px-4 bg-[#FAF7F2]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] text-center mb-16 font-serif">
            How It Works
          </h2>
          <div className="space-y-8">
            {[
              { step: '01', title: 'Add Project Details', desc: 'Input location, pricing, configuration, and upload images.' },
              { step: '02', title: 'Publish Page', desc: 'Our system generates a secure, SEO-friendly landing page instantly.' },
              { step: '03', title: 'Share & Track', desc: 'Send the official link to clients. Track visits and inquiries.' },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-6 p-6 bg-white rounded-xl border border-[#E7E5E4] shadow-sm">
                <div className="text-4xl font-bold text-[#E7E5E4] font-serif">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#2A2A2A] mb-2">{item.title}</h3>
                  <p className="text-[#57534E]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#2A2A2A] text-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-[#B45309] rounded flex items-center justify-center font-serif font-bold">H</div>
             <span className="font-serif font-bold text-lg">HomeInTown</span>
          </div>
          <p className="text-[#A8A29E] text-sm">
            © 2026 HomeInTown. Built for Indian Real Estate.
          </p>
        </div>
      </footer>
    </main>
  );
}
