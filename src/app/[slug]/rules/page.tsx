export default function RulesPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h1>Rules</h1>

      <div className="card rules-content" style={{ marginBottom: '1.5rem' }}>
        <h2>Overview</h2>
        <p>
          Each participant predicts the score of every match before kickoff. After the real result
          is entered, points are awarded automatically. Highest total wins the prize.
        </p>
      </div>

      <div className="card rules-content" style={{ marginBottom: '1.5rem' }}>
        <h2>Making predictions</h2>
        <ul>
          <li>Go to <strong>Predict</strong>, select or create your name, and enter scores for each match.</li>
          <li>Predictions <strong>lock at kickoff</strong> — you cannot change a pick after the match starts.</li>
          <li>You do not need to predict every match; any match you skip stays blank on the <strong>Predictions</strong> table and earns 0 points.</li>
          <li>Knockout bracket teams may show placeholders (e.g. W73, 1A) until earlier matches are played; those slots fill in automatically when results are entered.</li>
        </ul>
      </div>

      <div className="card rules-content" style={{ marginBottom: '1.5rem' }}>
        <h2>Regulation-time scoring (all matches)</h2>
        <p>For each match, you earn <strong>either</strong> the exact-score bonus <strong>or</strong> the correct-outcome bonus — not both.</p>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Exact score</th>
              <th>Correct winner or draw</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Group stage</td><td>3 pts</td><td>1 pt</td></tr>
            <tr><td>Round of 32</td><td>6 pts</td><td>2 pts</td></tr>
            <tr><td>Round of 16</td><td>9 pts</td><td>3 pts</td></tr>
            <tr><td>Quarter-final</td><td>12 pts</td><td>4 pts</td></tr>
            <tr><td>Semi-final</td><td>15 pts</td><td>5 pts</td></tr>
            <tr><td>Third-place match</td><td>15 pts</td><td>5 pts</td></tr>
            <tr><td>Final</td><td>21 pts</td><td>7 pts</td></tr>
          </tbody>
        </table>
        <p><strong>Exact score:</strong> your predicted home and away goals match the official result after 90 minutes (plus stoppage time) exactly.</p>
        <p><strong>Correct outcome:</strong> you got the result right (home win, away win, or draw) but not the exact score.</p>
        <p><strong>Wrong outcome:</strong> 0 points.</p>
      </div>

      <div className="card rules-content" style={{ marginBottom: '1.5rem' }}>
        <h2>Score Jackpot (from M25 — Czechia vs South Africa)</h2>
        <p>
          A separate <strong>jackpot</strong> runs alongside normal points. It rewards exact-score
          picks (or the correct penalty winner in knockout draws) and rolls over when nobody wins a
          match slice.
        </p>
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Pot growth</h3>
        <ul>
          <li>The jackpot starts at <strong>0</strong> when this rule begins.</li>
          <li>Matches before <strong>M25</strong> do not add to or pay out the jackpot.</li>
          <li>
            When an eligible match <strong>kickoff time</strong> passes, <strong>x</strong> is added to
            the pot (you do not need to wait for the final score).
          </li>
        </ul>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Added to pot (x)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Group stage</td><td>2 pts</td></tr>
            <tr><td>Round of 32</td><td>4 pts</td></tr>
            <tr><td>Round of 16</td><td>6 pts</td></tr>
            <tr><td>Quarter-final</td><td>8 pts</td></tr>
            <tr><td>Semi-final</td><td>10 pts</td></tr>
            <tr><td>Third-place match</td><td>10 pts</td></tr>
            <tr><td>Final</td><td>12 pts</td></tr>
          </tbody>
        </table>
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Claiming the pot</h3>
        <p>When official results are entered for eligible matches:</p>
        <ol>
          <li>Find everyone with a <strong>jackpot-winning</strong> prediction (see below).</li>
          <li>
            Matches that <strong>kick off at the same time</strong> settle together. The current pot
            is split evenly across those matches.
          </li>
          <li>
            <strong>Exactly one</strong> winner on a match → that player wins that match&apos;s slice.
          </li>
          <li>
            <strong>Zero</strong> winners on a match, or <strong>two or more</strong> winners on the
            same match → that slice stays in the pot.
          </li>
          <li>
            If you are the only winner across every simultaneous match in the group, you take the
            whole pot.
          </li>
        </ol>
        <p>Jackpot winnings are separate from normal match points but count toward your leaderboard total.</p>
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Jackpot-winning prediction</h3>
        <p>
          <strong>Non-draw (or group-stage draw):</strong> predicted home and away goals must match the
          official result exactly (90 minutes plus stoppage).
        </p>
        <p>
          <strong>Knockout draw that goes to penalties:</strong> predicted regulation score must match
          exactly, you must enter a penalty pick, and your predicted <strong>shootout winner</strong>{' '}
          must match — exact PK score is <strong>not</strong> required.
        </p>
        <p>Example — result <strong>1–1</strong>, PK <strong>5–4</strong> (home wins shootout):</p>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Your pick</th>
              <th>Jackpot?</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1–1, PK 3–2</td><td>Yes — exact regulation + correct shootout winner</td></tr>
            <tr><td>1–1, PK 5–4</td><td>Yes</td></tr>
            <tr><td>1–1, PK 4–5</td><td>No — wrong shootout winner</td></tr>
            <tr><td>2–2, PK 5–4</td><td>No — wrong regulation score</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card rules-content" style={{ marginBottom: '1.5rem' }}>
        <h2>Knockout penalty predictions (Round of 32 and later)</h2>
        <ul>
          <li>Group-stage matches cannot have penalty predictions.</li>
          <li>If you predict the match will <strong>end in a draw</strong>, you may also enter a predicted <strong>penalty shootout score</strong> (e.g. home 5, away 3).</li>
          <li>You <strong>cannot</strong> enter a penalty prediction unless your regulation score is a draw.</li>
          <li>Your penalty pick implies which team you think <strong>advances</strong> (wins the shootout).</li>
        </ul>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Penalty bonus</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Round of 32</td><td>4 pts</td></tr>
            <tr><td>Round of 16</td><td>6 pts</td></tr>
            <tr><td>Quarter-final</td><td>8 pts</td></tr>
            <tr><td>Semi-final / Third-place</td><td>10 pts</td></tr>
            <tr><td>Final</td><td>14 pts</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card rules-content">
        <h2>Pages</h2>
        <ul>
          <li><strong>Leaderboard</strong> — running totals (match points + jackpot), current pot, and score history chart.</li>
          <li><strong>Predictions</strong> — spreadsheet of everyone&apos;s predicted scores.</li>
          <li><strong>Admin</strong> — admin enters official match scores; updates bracket and points.</li>
        </ul>
      </div>
    </div>
  )
}
