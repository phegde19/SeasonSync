function GameCard({ game }) {
    const leagueColors = {
        MLB: "#0C2C56",
        NFL: "#013369",
        NBA: "#1D428A",
        NHL: "#111111",
        SOCCER: "#0B8F3C",
        CFB: "#B22222",
        F1: "#E10600",
        TENNIS: "#2E8B57",
      };

    return (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,.08)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    width: "fit-content",
    background: leagueColors[game.league] || "#444",
    color: "white",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "600",
    fontSize: "13px",
  }}
>
  {game.emoji} {game.league}
</div>
      
          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              lineHeight: "1.3",
            }}
          >
            {game.awayTeam && game.homeTeam
              ? `${game.awayTeam} @ ${game.homeTeam}`
              : game.gameName}
          </div>
      
          <div
            style={{
              color: "#444",
            }}
          >
            🗓️{" "}
            {new Date(game.gameDate).toLocaleString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
      
          <div
            style={{
              color: "#888",
              fontSize: "15px",
            }}
          >
            📍 {game.venue}
          </div>
        </div>
      );
  }
  
  export default GameCard;