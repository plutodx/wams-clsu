// Shared shell for the auth pages (Login, Register, Verify, Forgot).
// Green curved hero with the CLSU seal on top, then a white card below,
// styled after the CLSU TESO Faculty Performance Evaluation page.
const CLSU_SEAL = 'https://evaluation.ctec.clsu.edu.ph/favicon.ico'

export default function AuthShell({ children, subtitle }) {
  return (
    <div className="authpage">
      <header className="authhero">
        <div className="authhero__top">
          <span className="authhero__office">CLSU Workflow and Approval Management System</span>
          <span className="authhero__nav">Guidelines</span>
        </div>
        <div className="authhero__center">
          <div className="brandseal">
            <img src={CLSU_SEAL} alt="CLSU seal"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.classList.add('brandseal--fallback') }} />
            <span className="brandseal__txt">CLSU</span>
          </div>
          <h1 className="authhero__title">
            Workflow &amp; Approval
            <strong>Management System</strong>
          </h1>
          {subtitle && <p className="authhero__sub">{subtitle}</p>}
        </div>
      </header>

      <main className="authbody">
        <div className="authcard">{children}</div>
      </main>
    </div>
  )
}
