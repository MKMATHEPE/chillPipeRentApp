import AppDock from '../components/AppDock';

const terms = [
  'Booking is confirmed once the final quoted amount, including the refundable security deposit, has been paid in full.',
  'A refundable security deposit of R308 (56% of the R550 rental price) applies to each hookah pipe.',
  'Equipment must be returned within 24 hours of the confirmed collection time, complete and in the same condition supplied.',
  'Consumables do not need to be returned.',
  'Costs for lost, damaged or broken equipment will be deducted from the security deposit.',
  'The remaining deposit balance will be refunded within 24–48 hours after the returned equipment has been inspected and found to be in good condition.',
  'Delivery is available at an additional charge quoted according to the client’s location. Customer collection from Vorna Valley is included.',
  'Cancellations made at least 48 hours before the booking time receive a full refund. Later cancellations incur a 20% cancellation fee, with 80% of the amount paid refunded.',
  'For collection bookings, R25 is charged for every 30 minutes after the confirmed collection time.',
  'A missed collection is cancelled after 12 hours or at 23:59 on the collection date, whichever comes first. The security deposit is refunded in full, and 35% of the rental payment is refunded.',
  'Late returns may result in an additional daily rental charge.',
  'The client must use the equipment safely and according to the instructions provided.',
  'Equipment may only be operated by persons aged 18 or older. A valid government-issued photo ID is required.',
  'Equipment will be inspected when returned before the rental is considered complete.',
  'Unless delivery and collection are arranged, the client is responsible for collecting and returning the equipment at the agreed time and location.',
  'Use your name or quotation number as the payment reference.',
  'Payment of the quotation confirms acceptance of these terms and conditions.',
];

export default function Terms() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/">
          <img src="/chill-pipe-logo.webp" alt="The Chill Pipe" />
        </a>
        <nav className="main-nav">
          <a href="/">Book</a>
          <a href="/how-it-works">How it works</a>
          <a className="active" href="/terms">
            Terms
          </a>
        </nav>
        <div className="header-note">
          <span className="pulse" /> Clear and simple
        </div>
      </header>
      <section className="terms-hero">
        <div>
          <p className="eyebrow">Before you book</p>
          <h1>
            Good times.
            <br />
            <em>Clear terms.</em>
          </h1>
        </div>
        <p>
          Everything you need to know about booking, care, returns, delivery and
          cancellation.
        </p>
      </section>
      <section className="terms-page">
        <div className="terms-intro">
          <h2>Rental terms and conditions</h2>
          <p>
            These terms help keep every booking smooth and every setup in great
            condition for the next client.
          </p>
          <a href="/">Back to booking</a>
        </div>
        <ol>
          {terms.map((term, index) => (
            <li key={term}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{term}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="bank-strip">
        <p>Payments are made to</p>
        <div>
          <span>Bank</span>
          <strong>FNB</strong>
        </div>
        <div>
          <span>Account name</span>
          <strong>The Chill Pipe</strong>
        </div>
        <div>
          <span>Account number</span>
          <strong>63108000075</strong>
        </div>
        <div>
          <span>Branch code</span>
          <strong>25065</strong>
        </div>
      </section>
      <footer>
        <img src="/chill-pipe-logo.webp" alt="" />
        <p>Bring the chill, we bring the pipe.</p>
        <span>24-hour hookah rentals</span>
      </footer>
      <AppDock active="terms" />
    </main>
  );
}
