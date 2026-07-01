// ====================
// MLB
// ====================

export const getMLBTeams = async () => {
    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/teams?sportId=1"
    );
  
    const data = await response.json();
  
    return data.teams
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((team) => ({
        id: `mlb-${team.id}`,
        name: team.name,
        league: "MLB",
        teamId: team.id,
        emoji: "⚾",
        logo: `https://www.mlbstatic.com/team-logos/${team.id}.svg`,
      }));
  };

  export const getSoccerTeams = async () => {
    const leagues = [
      "esp.1", // La Liga
      "eng.1", // Premier League
      "ger.1", // Bundesliga
      "ita.1", // Serie A
      "fra.1", // Ligue 1
    ];
  
    let allTeams = [];
  
    for (const league of leagues) {
      const response = await fetch(
        `/espn/apis/site/v2/sports/soccer/${league}/teams`
      );
  
      const data = await response.json();
  
      if (
        data.sports?.[0]?.leagues?.[0]?.teams
      ) {
        const teams =
  data.sports[0].leagues[0].teams.map(
    ({ team }) => ({
      id: `SOCCER-${team.id}`,
      name: team.displayName,
      league: "SOCCER",
      teamId: team.id,
      leagueCode: league,
      emoji: "⚽",
      logo: team.logos?.[0]?.href,
    })
  );
  
        allTeams = [...allTeams, ...teams];
      }
    }
  
    return allTeams.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  };
  
  export const getMLBSchedule = async (
    teamId,
    season = new Date().getFullYear()
  ) => {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&season=${season}`
    );
  
    return await response.json();
  };
  
  // ====================
  // GENERIC ESPN FUNCTIONS
  // ====================
  
  export const getESPNTeams = async (
    sport,
    league,
    emoji,
    leagueCode
  ) => {
    const response = await fetch(
        `/espn/apis/site/v2/sports/${sport}/${league}/teams?limit=500`
      );
      console.log(data.sports[0].leagues[0].teams[0].team);
  
    const data = await response.json();
    console.log(data);
    if (
      !data.sports ||
      !data.sports[0] ||
      !data.sports[0].leagues ||
      !data.sports[0].leagues[0]
    ) {
      return [];
    }
  
    return data.sports[0].leagues[0].teams
      .map(({ team }) => ({
        id: `${leagueCode}-${team.id}`,
        name: team.displayName,
        league: leagueCode,
        teamId: team.id,
        emoji,
        logo: team.logos?.[0]?.href,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  
  export const getESPNSchedule = async (
    sport,
    league,
    teamId
  ) => {
    const response = await fetch(
        `/espn/apis/site/v2/sports/${sport}/${league}/teams/${teamId}/schedule`
      );
  
    return await response.json();
  };

  export const getF1Schedule = async () => {
    const response = await fetch(
      "https://api.jolpi.ca/ergast/f1/2026/races/"
    );
  
    return await response.json();
  };
  
  // ====================
  // TEAM FETCHER
  // ====================
  
  export const getTeamsByLeague = async (
    league
  ) => {
    switch (league) {
      case "MLB":
        return await getMLBTeams();
  
      case "NFL":
        return await getESPNTeams(
          "football",
          "nfl",
          "🏈",
          "NFL"
        );
  
      case "NBA":
        return await getESPNTeams(
          "basketball",
          "nba",
          "🏀",
          "NBA"
        );
  
      case "NHL":
        return await getESPNTeams(
          "hockey",
          "nhl",
          "🏒",
          "NHL"
        );
  
      case "CFB":
        return await getESPNTeams(
          "football",
          "college-football",
          "🤘",
          "CFB"
        );

      case "SOCCER":
        return await getSoccerTeams();
      
      case "F1":
        return [
            {
              id: "F1",
              name: "Formula 1",
              league: "F1",
              teamId: "f1",
              emoji: "🏁",
            },
          ];
        case "TENNIS":
          return [
              {
                id: "TENNIS",
                name: "Tennis Finals",
                league: "TENNIS",
                teamId: "tennis",
                emoji: "🎾",
              },
            ];
    
  
      default:
        return [];
    }
  };
  
  // ====================
  // SCHEDULE FETCHER
  // ====================
  
  export const getSoccerSchedule = async (
    leagueCode,
    teamId
  ) => {
    const response = await fetch(
      `/espn/apis/site/v2/sports/soccer/${leagueCode}/teams/${teamId}/schedule`
    );
  
    return await response.json();
  };

  export const getScheduleByLeague = async (
    league,
    teamId
  ) => {
    switch (league) {
      case "MLB":
        return await getMLBSchedule(teamId);
  
      case "NFL":
        return await getESPNSchedule(
          "football",
          "nfl",
          teamId
        );
  
      case "NBA":
        return await getESPNSchedule(
          "basketball",
          "nba",
          teamId
        );
  
      case "NHL":
        return await getESPNSchedule(
          "hockey",
          "nhl",
          teamId
        );
  
      case "CFB":
        return await getESPNSchedule(
          "football",
          "college-football",
          teamId
        );
      case "SOCCER":
        return await getESPNSchedule(
          "soccer",
          "esp.1",
          teamId
        );
        case "F1":
          return await getF1Schedule();
        
        case "TENNIS":
          return null
  
      default:
        return null;
    }

    
  };