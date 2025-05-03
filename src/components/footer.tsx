export function Footer() {
  return (
    <footer className="w-full border-t border-neutral-200/50 bg-[#F8FAFC]">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-[#1D1D1F]">MediNote</h3>
            <p className="text-base text-[#64748B] leading-relaxed">
              Transforming medical documentation with AI-powered transcription
              and clinical trial matching.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#1D1D1F]">Features</h4>
            <ul className="space-y-3">
              <li className="text-base text-[#64748B] hover:text-[#1D1D1F] transition-colors">
                Audio Recording
              </li>
              <li className="text-base text-[#64748B] hover:text-[#1D1D1F] transition-colors">
                AI Transcription
              </li>
              <li className="text-base text-[#64748B] hover:text-[#1D1D1F] transition-colors">
                Clinical Trial Matching
              </li>
              <li className="text-base text-[#64748B] hover:text-[#1D1D1F] transition-colors">
                Secure Sharing
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#1D1D1F]">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/documentation"
                  className="text-base text-[#64748B] hover:text-blue-600 transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  className="text-base text-[#64748B] hover:text-blue-600 transition-colors"
                >
                  Support
                </a>
              </li>
              <li>
                <a
                  href="/blog"
                  className="text-base text-[#64748B] hover:text-blue-600 transition-colors"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-[#1D1D1F]">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/privacy"
                  className="text-base text-[#64748B] hover:text-blue-600 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-base text-[#64748B] hover:text-blue-600 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/hipaa"
                  className="text-base text-[#64748B] hover:text-blue-600 transition-colors"
                >
                  HIPAA Compliance
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-neutral-200/50">
          <p className="text-center text-sm text-[#64748B]">
            © {new Date().getFullYear()} MediNote. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
