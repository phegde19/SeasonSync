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
      }));
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
  
      default:
        return [];
    }
  };
  
  // ====================
  // SCHEDULE FETCHER
  // ====================
  
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
  
      default:
        return null;
    }
  };