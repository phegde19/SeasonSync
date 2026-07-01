import GameCard from "../components/GameCard";
import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { getTeamsByLeague, getScheduleByLeague, getSoccerSchedule } from "./services/sportsApi";

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
    const check = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        existingCalendarId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    if (check.ok) {
      alert("SportSync calendar already exists.");
      return;
    }
  
    // Calendar was deleted in Google
    localStorage.removeItem("calendarId");
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

  const importNFLSchedule = async (team) => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
    console.log("Importing NFL schedule for", team);
    if (!token || !calendarId) {
      alert("Please connect Google and create a calendar first.");
      return {
        created: 0,
        skipped: 0,
      };
    }
  
    // Existing events
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
        const match =
          event.description.match(
            /Game ID:\s*(\d+)/
          );
  
        if (match) {
          existingGameIds.add(match[1]);
        }
      }
    });
  
    // Get Texans schedule
    const data =
      await getScheduleByLeague(
        "NFL",
        team.teamId
      );
      console.log("NFL data:", data);
console.log("Events:", data.events);
  
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const game of data.events) {
      const gameId = String(game.id);
  
      if (existingGameIds.has(gameId)) {
        skippedCount++;
        continue;
      }
  
      const startTime = new Date(game.date);
  
      const endTime = new Date(startTime);
      endTime.setHours(
        endTime.getHours() + 4
      );
  
      const event = {
        summary: `🏈 ${game.name}`,
        description: `NFL Game
  Game ID: ${game.id}`,
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
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };

  const importNBASchedule = async (team) => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    if (!token || !calendarId) {
      return {
        created: 0,
        skipped: 0,
      };
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
        const match =
          event.description.match(
            /Game ID:\s*(\d+)/
          );
  
        if (match) {
          existingGameIds.add(match[1]);
        }
      }
    });
  
    const data =
      await getScheduleByLeague(
        "NBA",
        team.teamId
      );
  
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const game of data.events) {
      const gameId = String(game.id);
  
      if (existingGameIds.has(gameId)) {
        skippedCount++;
        continue;
      }
  
      const startTime =
        new Date(game.date);
  
      const endTime =
        new Date(startTime);
  
      endTime.setHours(
        endTime.getHours() + 3
      );
  
      const event = {
        summary: `🏀 ${game.name}`,
        description: `NBA Game
  Game ID: ${game.id}`,
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
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };

  const importNHLSchedule = async (team) => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    if (!token || !calendarId) {
      return {
        created: 0,
        skipped: 0,
      };
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
        const match =
          event.description.match(
            /Game ID:\s*(\d+)/
          );
  
        if (match) {
          existingGameIds.add(match[1]);
        }
      }
    });
  
    const data =
      await getScheduleByLeague(
        "NHL",
        team.teamId
      );
  
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const game of data.events) {
      const gameId = String(game.id);
  
      if (existingGameIds.has(gameId)) {
        skippedCount++;
        continue;
      }
  
      const startTime =
        new Date(game.date);
  
      const endTime =
        new Date(startTime);
  
      endTime.setHours(
        endTime.getHours() + 3
      );
  
      const event = {
        summary: `🏒 ${game.name}`,
description: `NHL Game
  Game ID: ${game.id}`,
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
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };

  const importCFBSchedule = async (team) => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    if (!token || !calendarId) {
      return {
        created: 0,
        skipped: 0,
      };
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
        const match =
          event.description.match(
            /Game ID:\s*(\d+)/
          );
  
        if (match) {
          existingGameIds.add(match[1]);
        }
      }
    });
  
    const data =
      await getScheduleByLeague(
        "CFB",
        team.teamId
      );
      console.log("CFB DATA:", data);
      console.log("CFB EVENTS:", data.events);
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const game of data.events) {
      const gameId = String(game.id);
  
      if (existingGameIds.has(gameId)) {
        skippedCount++;
        continue;
      }
  
      const startTime =
        new Date(game.date);
  
      const endTime =
        new Date(startTime);
  
      endTime.setHours(
        endTime.getHours() + 3
      );
  
      const event = {
        summary: `🤘 ${game.name}`,

description: `College Football
Game ID: ${game.id}`,
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
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };

  const importSoccerSchedule = async (team) => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    console.log("TOKEN:", token);
    console.log("CALENDAR ID:", calendarId);
  
    if (!token || !calendarId) {
      console.log("RETURNING EARLY");
  
      return {
        created: 0,
        skipped: 0,
      };
    }
  
    console.log("ENTERED SOCCER FUNCTION");
  
    // Get existing calendar events so we don't create duplicates
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
        const match =
          event.description.match(
            /Game ID:\s*(\d+)/
          );
  
        if (match) {
          existingGameIds.add(match[1]);
        }
      }
    });
  
    // Get schedule from ESPN
    const data = await getSoccerSchedule(
      team.leagueCode,
      team.teamId
    );
  
    console.log("SOCCER DATA:", data);
    console.log("SOCCER EVENTS:", data.events);
  
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const game of data.events || []) {
      const gameId = String(game.id);
  
      if (existingGameIds.has(gameId)) {
        skippedCount++;
        continue;
      }
  
      const startTime =
        new Date(game.date);
  
      const endTime =
        new Date(startTime);
  
      // Soccer games are usually around 2 hours
      endTime.setHours(
        endTime.getHours() + 2
      );
  
      const event = {
        summary: `⚽ ${game.name}`,
        description: `Soccer Match
  Game ID: ${game.id}`,
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
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };

  const importF1Schedule = async () => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    if (!token || !calendarId) {
      return {
        created: 0,
        skipped: 0,
      };
    }
  
    const response = await fetch(
      "https://api.jolpi.ca/ergast/f1/2026/races/"
    );
  
    const data = await response.json();
  
    const races =
      data.MRData.RaceTable.Races;
  
    let createdCount = 0;
    let skippedCount = 0;
  
    const existingEventsResponse =
      await fetch(
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
  
    const existingRaceIds = new Set();
  
    existingEventsData.items?.forEach(
      (event) => {
        if (
          event.description?.includes(
            "Race ID:"
          )
        ) {
          const match =
            event.description.match(
              /Race ID:\s*(.+)/
            );
  
          if (match) {
            existingRaceIds.add(match[1]);
          }
        }
      }
    );
  
    for (const race of races) {
      const raceId = `${race.season}-${race.round}`;
  
      if (existingRaceIds.has(raceId)) {
        skippedCount++;
        continue;
      }
  
      const startTime = new Date(
        `${race.date}T${race.time}`
      );
  
      const endTime = new Date(
        startTime
      );
  
      endTime.setHours(
        endTime.getHours() + 2
      );
  
      const event = {
        summary: `🏁 ${race.raceName}`,
        location: `${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`,
        description: `Formula 1 Grand Prix
  Race ID: ${raceId}`,
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
              minutes: 60,
            },
          ],
        },
      };
  
      const createResponse =
        await fetch(
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
            body: JSON.stringify(
              event
            ),
          }
        );
  
      if (createResponse.ok) {
        createdCount++;
      }
    }
  
    return {
      created: createdCount,
      skipped: skippedCount,
    };
  };
  const importTennisSchedule = async () => {
    const token = localStorage.getItem("access_token");
    const calendarId = localStorage.getItem("calendarId");
  
    if (!token || !calendarId) {
      return {
        created: 0,
        skipped: 0,
      };
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
  
    const existingIds = new Set();
  
    existingEventsData.items?.forEach((event) => {
      if (
        event.description?.includes(
          "Tennis ID:"
        )
      ) {
        const match =
          event.description.match(
            /Tennis ID:\s*(.+)/
          );
  
        if (match) {
          existingIds.add(match[1]);
        }
      }
    });
  
    const finals = [
      {
        id: "AO-2027",
        name: "Australian Open Men's Final",
        date: "2027-01-31T08:30:00Z",
        location: "Melbourne Park, Australia",
      },
      {
        id: "FO-2027",
        name: "French Open Men's Final",
        date: "2027-06-13T13:00:00Z",
        location: "Roland Garros, France",
      },
      {
        id: "WIM-2026",
        name: "Wimbledon Men's Final",
        date: "2026-07-12T14:00:00Z",
        location: "Wimbledon, England",
      },
      {
        id: "USO-2026",
        name: "US Open Men's Final",
        date: "2026-09-13T20:00:00Z",
        location: "Flushing Meadows, USA",
      },
      {
        id: "ATP-2026",
        name: "ATP Finals Championship",
        date: "2026-11-22T18:00:00Z",
        location: "Turin, Italy",
      },
      {
        id: "IW-2026",
        name: "Indian Wells Final",
        date: "2026-03-15T21:00:00Z",
        location: "Indian Wells Tennis Garden, USA",
      },
      {
        id: "MIA-2026",
        name: "Miami Open Final",
        date: "2026-03-29T19:00:00Z",
        location: "Hard Rock Stadium, USA",
      },
      {
        id: "MON-2026",
        name: "Monte Carlo Masters Final",
        date: "2026-04-19T13:00:00Z",
        location: "Monte Carlo Country Club, Monaco",
      },
      {
        id: "MAD-2026",
        name: "Madrid Open Final",
        date: "2026-05-03T16:30:00Z",
        location: "Caja Mágica, Spain",
      },
      {
        id: "ROM-2026",
        name: "Italian Open Final",
        date: "2026-05-17T15:00:00Z",
        location: "Foro Italico, Italy",
      },
      {
        id: "CAN-2026",
        name: "Canadian Open Final",
        date: "2026-08-09T20:00:00Z",
        location: "Toronto/Montreal, Canada",
      },
      {
        id: "CIN-2026",
        name: "Cincinnati Open Final",
        date: "2026-08-23T20:00:00Z",
        location: "Mason, Ohio, USA",
      },
      {
        id: "SHA-2026",
        name: "Shanghai Masters Final",
        date: "2026-10-18T08:00:00Z",
        location: "Shanghai, China",
      },
      {
        id: "PAR-2026",
        name: "Paris Masters Final",
        date: "2026-11-08T14:00:00Z",
        location: "Paris, France",
      },
    ];
  
    let createdCount = 0;
    let skippedCount = 0;
  
    for (const final of finals) {
      if (existingIds.has(final.id)) {
        skippedCount++;
        continue;
      }
  
      const startTime =
        new Date(final.date);
  
      const endTime =
        new Date(startTime);
  
      endTime.setHours(
        endTime.getHours() + 4
      );
  
      const event = {
        summary: `🎾 ${final.name}`,
        location: final.location,
        description: `Tennis Final
  Tennis ID: ${final.id}`,
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
              minutes: 60,
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
    for (const team of selectedTeams) {
      try {
    
        //
        // Tennis (hardcoded)
        //
        if (team.league === "TENNIS") {
          console.log("INSIDE TENNIS");
    
          const finals = [
            {
              id: "WIM-2026",
              name: "Wimbledon Men's Final",
              date: "2026-07-12T14:00:00Z",
              location: "Wimbledon, England",
            },
            {
              id: "USO-2026",
              name: "US Open Men's Final",
              date: "2026-09-13T20:00:00Z",
              location: "Flushing Meadows, USA",
            },
            {
              id: "ATP-2026",
              name: "ATP Finals Championship",
              date: "2026-11-22T18:00:00Z",
              location: "Turin, Italy",
            },
            {
              id: "IW-2026",
              name: "Indian Wells Final",
              date: "2026-03-15T21:00:00Z",
              location: "Indian Wells Tennis Garden",
            },
            {
              id: "MIA-2026",
              name: "Miami Open Final",
              date: "2026-03-29T19:00:00Z",
              location: "Miami",
            },
            {
              id: "MON-2026",
              name: "Monte Carlo Masters Final",
              date: "2026-04-19T13:00:00Z",
              location: "Monte Carlo",
            },
            {
              id: "MAD-2026",
              name: "Madrid Open Final",
              date: "2026-05-03T16:30:00Z",
              location: "Madrid",
            },
            {
              id: "ROM-2026",
              name: "Italian Open Final",
              date: "2026-05-17T15:00:00Z",
              location: "Rome",
            },
            {
              id: "CAN-2026",
              name: "Canadian Open Final",
              date: "2026-08-09T20:00:00Z",
              location: "Canada",
            },
            {
              id: "CIN-2026",
              name: "Cincinnati Open Final",
              date: "2026-08-23T20:00:00Z",
              location: "Cincinnati",
            },
            {
              id: "SHA-2026",
              name: "Shanghai Masters Final",
              date: "2026-10-18T08:00:00Z",
              location: "Shanghai",
            },
            {
              id: "PAR-2026",
              name: "Paris Masters Final",
              date: "2026-11-08T14:00:00Z",
              location: "Paris",
            },
            {
              id: "AO-2027",
              name: "Australian Open Men's Final",
              date: "2027-01-31T08:30:00Z",
              location: "Melbourne Park, Australia",
            },
            {
              id: "FO-2027",
              name: "French Open Men's Final",
              date: "2027-06-13T13:00:00Z",
              location: "Roland Garros, France",
            },
          ];
    
          finals.forEach((event) => {
            const gameDate = new Date(event.date);
    
            if (gameDate < today || gameDate > weekFromNow) {
              return;
            }
    
            allGames.push({
              id: event.id,
              league: "TENNIS",
              emoji: "🎾",
              gameName: event.name,
              gameDate,
              venue: event.location,
            });
          });
    
          continue;
        }
    
        //
        // Everything else fetches data
        //
        const data = await getScheduleByLeague(
          team.league,
          team.teamId
        );
    
        console.log(data);
    
        if (!data) continue;
    
        //
        // MLB
        //
        if (team.league === "MLB") {
          data.dates?.forEach((date) => {
            date.games?.forEach((game) => {
              const gameDate = new Date(
                game.gameDate
              );
  
              if (
                gameDate < today ||
                gameDate > weekFromNow
              ) {
                return;
              }
  
              allGames.push({
                id: game.gamePk,
                league: "MLB",
                emoji: "⚾",
                awayTeam:
                  game.teams.away.team.name,
                homeTeam:
                  game.teams.home.team.name,
                gameDate: game.gameDate,
                venue: game.venue?.name,
              });
            });
          });
        }

    
        //
        // Formula 1
        //
        else if (team.league === "F1") {
          data.MRData.RaceTable.Races.forEach((race) =>  {
            const raceDate = new Date(`${race.date}T${race.time || "00:00:00Z"}`);
        
            if (raceDate < today || raceDate > weekFromNow) {
              return;
            }
        
            allGames.push({
              id: race.round,
              league: "F1",
              emoji: "🏁",
              gameName: race.raceName,
              gameDate: raceDate,
              venue: `${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`,
            });

          });
        }
    
        //
        // ESPN Sports
        //
        else {
          console.log(team.league);
console.log(data.events);
          data.events?.forEach((event) => {
            const gameDate = new Date(
              event.date
            );
  
            if (
              gameDate < today ||
              gameDate > weekFromNow
            ) {
              console.log(
                team.league,
                event.date,
                new Date(event.date)
              );
              return;
            }
  
            const competition =
              event.competitions?.[0];

            const homeTeam =
              competition?.competitors?.find(
                (c) => c.homeAway === "home"
              )?.team?.displayName;

            const awayTeam =
              competition?.competitors?.find(
                (c) => c.homeAway === "away"
              )?.team?.displayName;

            allGames.push({
              id: event.id,
              league: team.league,
              emoji: team.emoji,
              awayTeam,
              homeTeam,
              gameName: event.name,
              gameDate: event.date,
              venue:
                competition?.venue?.fullName,
            });
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  
    const uniqueGames = [
      ...new Map(
        allGames.map((game) => [
          game.id,
          game,
        ])
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
    console.log("ALL GAMES:", uniqueGames);
    setWeekGames(uniqueGames);
  
    setLoadingGames(false);
  };
  console.log(selectedTeams);
  const syncSelectedTeams = async () => {
    console.log("Selected:", selectedTeams);
  
    if (selectedTeams.length === 0) {
      alert("Select at least one team.");
      return;
    }
  
    let totalCreated = 0;
    let totalSkipped = 0;
  
    for (const team of selectedTeams) {
      console.log("Processing:", team);
  
      switch (team.league) {
        case "MLB": {
          console.log("INSIDE MLB");
  
          const result =
            await importMLBSchedule(team);
  
          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
        }
  
        case "NFL": {
          console.log("INSIDE NFL");
  
          const result =
            await importNFLSchedule(team);
  
          console.log("NFL RESULT:", result);
  
          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
        }

        case "NBA": {
          const result =
            await importNBASchedule(team);
        
          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
        }
        
        case "NHL": {
          const result =
            await importNHLSchedule(team);
        
          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
        }

        case "CFB": {
          const result =
            await importCFBSchedule(team);

          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
        }

        case "SOCCER": {      
          console.log("INSIDE SOCCER");

          const result =
            await importSoccerSchedule(team);
          console.log("SOCCER RESULT:", result);

          totalCreated += result.created;
          totalSkipped += result.skipped;
          break;
        }

        case "F1": {
          console.log("INSIDE F1");
        
          const result =
            await importF1Schedule();
        
          console.log(
            "F1 RESULT:",
            result
          );
        
          totalCreated += result.created;
          totalSkipped += result.skipped;
        
          break;
        }

        case "TENNIS": {
          console.log("INSIDE TENNIS");
        
          const result =
            await importTennisSchedule();
        
          console.log(
            "TENNIS RESULT:",
            result
          );
        
          totalCreated += result.created;
          totalSkipped += result.skipped;
        
          break;
        }
  
        default:
          console.log(
            "NO MATCH:",
            team.league
          );
      }
    }
  
    alert(`
  Created: ${totalCreated}
  Skipped: ${totalSkipped}
  `);
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
          <option value="SOCCER">Soccer</option>
          <option value="F1">F1</option>
          <option value="TENNIS">TENNIS</option>
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
              <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }}
>
  {team.logo ? (
    <img
      src={team.logo}
      alt={team.name}
      style={{
        width: "30px",
        height: "30px",
        objectFit: "contain",
      }}
    />
  ) : (
    <span style={{ fontSize: "22px" }}>
      {team.emoji}
    </span>
  )}

  <span>{team.name}</span>
</div>
  
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
              <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }}
>
  {team.logo ? (
    <img
      src={team.logo}
      alt={team.name}
      style={{
        width: "30px",
        height: "30px",
        objectFit: "contain",
      }}
    />
  ) : (
    <span style={{ fontSize: "22px" }}>
      {team.emoji}
    </span>
  )}

  <span>{team.name}</span>
</div>
  
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
  <GameCard
    key={game.id}
    game={game}
  />
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
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }}
>
    {weekGames.map((game) => (
  <GameCard
    key={game.id}
    game={game}
  />
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