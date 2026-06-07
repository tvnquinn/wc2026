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
          <li><strong>Leaderboard</strong> — running totals and a score history chart (x-axis by date).</li>
          <li><strong>Predictions</strong> — spreadsheet of everyone&apos;s predicted scores.</li>
          <li><strong>Admin</strong> — admin enters official match scores; updates bracket and points.</li>
        </ul>
      </div>
    </div>
  )
}
