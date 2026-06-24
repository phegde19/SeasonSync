import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { getTeamsByLeague } from "./services/sportsApi";

function App() {
  const [selectedTeams, setSelectedTeams] = useState(() => {
    const saved = localStorage.getItem("selectedTeams");
    return saved ? JSON.parse(saved) : [];
  });

const [search, setSearch] = useState("");
const [todayGames, setTodayGames] = useState([]);
const [weekGames, setWeekGames] = useState([]);
const [loadingGames, setLoadingGames] = useState(false);
const [league, setLeague] = useState("MLB");
const [availableTeams, setAvailableTeams] = useState([]); 
useEffect(() => {
  const fetchTeams = async () => {
    const teams = await getTeamsByLeague(
      league
    );

    setAvailableTeams(teams);
  };

  fetchTeams();
}, [league]);

  useEffect(() => {
    localStorage.setItem(
      "selectedTeams",
      JSON.stringify(selectedTeams)
    );
  }, [selectedTeams]);
  useEffect(() => {
    fetchUpcomingGames();
  }, [selectedTeams]);

  const toggleTeam = (team) => {
    setSelectedTeams((prev) => {
      const exists = prev.find((t) => t.id === team.id);

      if (exists) {
        return prev.filter((t) => t.id !== team.id);
      }

      return [...prev, team];
    });
  };

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar",
    onSuccess: (tokenResponse) => {
      console.log("Login Success:", tokenResponse);
      localStorage.setItem(
        "access_token",
        tokenResponse.access_token
      );
    },
    onError: () => console.log("Login Failed"),
  });

  const createCalendar = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("Please connect Google Calendar first.");
      return;
    }

    const existingCalendarId =
      localStorage.getItem("calendarId");

    if (existingCalendarId) {
      alert("SportSync calendar already exists.");
      return;
    }

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "SportSync",
          timeZone: "America/Chicago",
        }),
      }
    );

    const data = await response.json();

    localStorage.setItem("calendarId", data.id);

    console.log("Calendar Created:", data);

    alert("SportSync calendar created!");
  };

  const createTestEvent = async () => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");

    if (!token || !calendarId) {
      alert("Please connect Google and create a calendar first.");
      return;
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "Houston Astros vs Texas Rangers",
          location: "Daikin Park",
          description: "SportSync Test Event",
          start: {
            dateTime: "2026-06-25T19:10:00-05:00",
          },
          end: {
            dateTime: "2026-06-25T22:10:00-05:00",
          },
        }),
      }
    );

    const data = await response.json();

    console.log("Event Created:", data);

    alert("Test event created!");
  };

  const importMLBSchedule = async (team) => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    if (!token || !calendarId) {
      alert("Please connect Google and create a calendar first.");
      return;
    }
  
    const existingEventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?maxResults=2500`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    const existingEventsData =
      await existingEventsResponse.json();
  
    const existingGameIds = new Set();
  
    existingEventsData.items?.forEach((event) => {
      if (event.description?.includes("Game ID:")) {
        const match = event.description.match(
          /Game ID:\s*(\d+)/
        );
  
        if (match) {
          existingGameIds.add(match[1]);
        }
      }
    });
  
    const scheduleResponse = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${team.teamId}&season=2026`
    );
  
    const scheduleData =
      await scheduleResponse.json();
  
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const date of scheduleData.dates) {
      for (const game of date.games) {
        const gameId = String(game.gamePk);
  
        if (existingGameIds.has(gameId)) {
          skippedCount++;
          continue;
        }
  
        const homeTeam =
          game.teams.home.team.name;
  
        const awayTeam =
          game.teams.away.team.name;
  
        const startTime =
          new Date(game.gameDate);
  
        const endTime =
          new Date(startTime);
  
        endTime.setHours(
          endTime.getHours() + 3
        );
  
        const event = {
          summary: `${team.emoji} ${awayTeam} @ ${homeTeam}`,
          location:
            game.venue?.name || "",
          description: `${team.league} Game
  Venue: ${game.venue?.name || ""}
  Game ID: ${game.gamePk}`,
          start: {
            dateTime:
              startTime.toISOString(),
          },
          end: {
            dateTime:
              endTime.toISOString(),
          },
          reminders: {
            useDefault: false,
            overrides: [
              {
                method: "popup",
                minutes: 30,
              },
            ],
          },
        };
  
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(event),
          }
        );
  
        if (response.ok) {
          createdCount++;
        }
      }
    }
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };

  const fetchUpcomingGames = async () => {
    if (selectedTeams.length === 0) {
      setTodayGames([]);
      setWeekGames([]);
      return;
    }
  
    setLoadingGames(true);
  
    const allGames = [];
  
    const today = new Date();
    const weekFromNow = new Date();
  
    weekFromNow.setDate(today.getDate() + 7);
  
    const startDate = today.toISOString().split("T")[0];
    const endDate = weekFromNow
      .toISOString()
      .split("T")[0];
  
    for (const team of selectedTeams) {
      if (team.league !== "MLB") continue;
  
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${team.teamId}&startDate=${startDate}&endDate=${endDate}`
        );
  
        const data = await response.json();
  
        data.dates.forEach((date) => {
          date.games.forEach((game) => {
            allGames.push({
              id: game.gamePk,
              teamName: team.name,
              awayTeam: game.teams.away.team.name,
              homeTeam: game.teams.home.team.name,
              gameDate: game.gameDate,
              venue: game.venue?.name,
            });
          });
        });
      } catch (err) {
        console.error(err);
      }
    }
  
    const uniqueGames = [
      ...new Map(
        allGames.map((game) => [game.id, game])
      ).values(),
    ];
  
    uniqueGames.sort(
      (a, b) =>
        new Date(a.gameDate) -
        new Date(b.gameDate)
    );
  
    const todayString =
      new Date().toDateString();
  
    setTodayGames(
      uniqueGames.filter(
        (game) =>
          new Date(
            game.gameDate
          ).toDateString() === todayString
      )
    );
  
    setWeekGames(uniqueGames);
  
    setLoadingGames(false);
  };

  const syncSelectedTeams = async () => {
    if (selectedTeams.length === 0) {
      alert("Select at least one team.");
      return;
    }
  
    let totalCreated = 0;
    let totalSkipped = 0;
  
    for (const team of selectedTeams) {
      switch (team.league) {
        case "MLB":
          const result =
            await importMLBSchedule(team);
    
          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
    
        case "NFL":
        case "NBA":
        case "NHL":
        case "CFB":
          console.log(
            `Schedule import not built for ${team.league} yet`
          );
          break;
    
        default:
          break;
      }
    }
  
    alert(
      `Sync Complete!
  
  Created: ${totalCreated}
  Skipped: ${totalSkipped}`
    );
  };

  return (
    <div
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <h1>SportSync</h1>
  
      <h2>Add Teams</h2>

        <select
          value={league}
          onChange={(e) =>
            setLeague(e.target.value)
          }
        >
          <option value="MLB">MLB</option>
          <option value="NFL">NFL</option>
          <option value="NBA">NBA</option>
          <option value="NHL">NHL</option>
          <option value="CFB">
            College Football
          </option>
        </select>
  
      <input
        type="text"
        placeholder={`Search ${league} teams...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "12px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />
  
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {availableTeams
          .filter(
            (team) =>
              team.name
                .toLowerCase()
                .includes(search.toLowerCase()) &&
              !selectedTeams.some(
                (selected) =>
                  selected.id === team.id
              )
          )
          .map((team) => (
            <div
              key={team.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {team.emoji} {team.name}
              </span>
  
              <button
                onClick={() => toggleTeam(team)}
              >
                Add
              </button>
            </div>
          ))}
      </div>
  
      <h2>My Teams</h2>

      
  
      {selectedTeams.length === 0 ? (
        <p>No teams selected.</p>
      ) : (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          {selectedTeams.map((team) => (
            <div
              key={team.id}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                padding: "12px",
                borderBottom:
                  "1px solid #eee",
              }}
            >
              <span>
                {team.emoji} {team.name}
              </span>
  
              <button
                onClick={() =>
                  toggleTeam(team)
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <h2>Today's Games</h2>

{loadingGames ? (
  <p>Loading games...</p>
) : todayGames.length === 0 ? (
  <p>No games today.</p>
) : (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    }}
  >
    {todayGames.map((game) => (
      <div
        key={game.id}
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "1rem",
        }}
      >
        <h3>
          ⚾ {game.awayTeam} @ {game.homeTeam}
        </h3>

        <p>
          🕐{" "}
          {new Date(
            game.gameDate
          ).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>

        <p>📍 {game.venue}</p>
      </div>
    ))}
  </div>
)}
<h2>This Week</h2>

{loadingGames ? (
  <p>Loading games...</p>
) : weekGames.length === 0 ? (
  <p>No upcoming games.</p>
) : (
  <div
    style={{
      border: "1px solid #ddd",
      borderRadius: "8px",
    }}
  >
    {weekGames.map((game) => (
      <div
        key={game.id}
        style={{
          padding: "12px",
          borderBottom: "1px solid #eee",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
          }}
        >
          ⚾ {game.awayTeam} @ {game.homeTeam}
        </div>

        <div>{game.venue}</div>

        <div>
          {new Date(
            game.gameDate
          ).toLocaleString()}
        </div>
      </div>
    ))}
  </div>
)}
  
      <button onClick={() => login()}>
        Connect Google Calendar
      </button>
  
      <button onClick={createCalendar}>
        Create SportSync Calendar
      </button>
  
      <button onClick={createTestEvent}>
        Create Test Event
      </button>
  
      <button onClick={syncSelectedTeams}>
        Sync Selected Teams
      </button>
    </div>
  );
}

export default App;