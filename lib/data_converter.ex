defmodule DataConverter do

  @accident_statuses ["Accident", "Collision", "Spun off"]
  @mecahnical_problem_statuses [
    "Clutch", "Electrical", "Engine", "Gearbox", 
    "Hydraulics", "Transmission", "Suspension", "Brakes",
    "Mechanical", "Tyre", "Puncture", "Wheel", 
    "Heat shield fire", "Oil leak", "Water leak", 
    "Wheel nut", "Rear wing", "Engine misfire", 
    "Vibrations", "Alternator", "Collision damage", 
    "Pneumatics", "Fuel system", "Technical", "Oil pressure", 
    "Drivetrain", "Turbo", "ERS", "Power Unit",
    "Water pressure", "Fuel pressure", "Throttle", 
    "Steering", "Electronics", "Exhaust",
    "Retired", "Withdrew", "Power loss"
  ]

  def convert_data(race_results, laps, pit_stops, drivers) do
    %{
      lap_count: get_lap_count(race_results),
      laps: get_laps(race_results, drivers, laps, pit_stops),
      lapped: [],
      safety: []
    }
  end

  def get_laps(race_results, drivers, laps, pit_stops) do
    initialize_laps(race_results)
    |> set_laps_placing(race_results, laps)
    |> set_laps_pit_stops(pit_stops)
  end

  def initialize_laps(race_results) do
    # Ergast marks the starting position of the drivers that did not participate in the race with a 0.
    driver_count = length(race_results)
    {ret, _} = Enum.map_reduce race_results, 0, fn(e, count_of_drivers_with_position_0_on_grid) ->
      placing = case parse_int(e["grid"]) do
        0 -> 
          pos = driver_count - count_of_drivers_with_position_0_on_grid
          count_of_drivers_with_position_0_on_grid = count_of_drivers_with_position_0_on_grid + 1
          pos
        pos -> 
          pos
      end

      accident = case Enum.find_index(@accident_statuses, &(&1 == e["status"])) do
        nil -> nil
        _ -> [parse_int(e["laps"])]
      end

      mechanical = case Enum.find_index(@mecahnical_problem_statuses, &(&1 == e["status"])) do
        nil -> nil
        _ -> [parse_int(e["laps"])]
      end

      disqualified = case e["status"] do
        "Disqualified" -> [parse_int(e["laps"])]
        _ -> nil
      end

      {%{
        driver: e["Driver"], 
        placing: [placing], 
        pitstops: [], 
        mechanical: mechanical, 
        accident: accident,
        disqualified: disqualified
      },
      count_of_drivers_with_position_0_on_grid}
    end
    ret
  end

  def set_laps_placing(laps, race_results, ergast_laps) do
    laps_done_by_winner = get_lap_count(race_results)
    Enum.reduce ergast_laps, laps, fn(ergast_lap, laps)->
      case parse_int(ergast_lap["number"]) <= laps_done_by_winner do
        false -> laps
        true -> laps |> update_laps_with_timing_info(ergast_lap)
      end
    end
  end

  def update_laps_with_timing_info(laps, ergast_lap_info) do
    Enum.reduce ergast_lap_info["Timings"], laps, fn(ergast_lap_info, laps)->
      {front, back} = Enum.split_while laps, fn(x) -> x.driver["driverId"] != ergast_lap_info["driverId"] end
      [lap_to_manipulate | rest] = back
      lap_to_manipulate = put_in(lap_to_manipulate, [:placing], lap_to_manipulate.placing ++ [parse_int(ergast_lap_info["position"])])
      List.flatten([front, lap_to_manipulate, rest])
    end
  end

  def set_laps_pit_stops(laps, pit_stops) do
    Enum.reduce pit_stops, laps, fn(pit_stop_info, laps)->
      {front, back} = Enum.split_while laps, fn(x) -> x.driver["driverId"] != pit_stop_info["driverId"] end
      [lap_to_manipulate | rest] = back
      lap_to_manipulate = put_in(lap_to_manipulate, [:pitstops], lap_to_manipulate.pitstops ++ [parse_int(pit_stop_info["lap"])])
      List.flatten([front, lap_to_manipulate, rest])
    end
  end

  def get_lap_count(race_results) do
    parse_int(hd(race_results)["laps"])
  end 


  # utils
  defp parse_int(str) when is_binary(str) do
    {ret, _} = Integer.parse(str)
    ret
  end
  defp parse_int(str) when is_integer(str) do
    str
  end


end

