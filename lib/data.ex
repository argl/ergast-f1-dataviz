defmodule Data do

  @max_respone_rows 300

  def main(args) do
    args |> parse_args |> process
  end

  def process([]) do
    IO.puts "No arguments given"
  end

  def process([type: "html", year: year, round: round]) do
    data_filename = "dd-f1-#{year}-#{round}.json"
    File.write("dd-f1-#{year}-#{round}.html", EEx.eval_file("laps.html.eex", [year: year, round: round, data_src: data_filename]))
    #File.write("dd-f1-qualy-#{year}-#{round}.html", EEx.eval_file("qualy.html.eex", [year: year, round: round, data_src: data_filename]))
  end


  def process([type: "all", year: year, round: round]) do
    #get_tire_data(year, round)

    # get tire data:
    tire_data = with_cached_file "dd-#{year}-#{round}-tires.json", fn() -> get_tire_data(year, round) end

    # get race results
    results = with_cached_file "dd-#{year}-#{round}-results.json", fn() -> get_results(year, round) end
    laps = with_cached_file "dd-#{year}-#{round}-laps.json", fn() -> get_laps(year, round) end
    pitstops = with_cached_file "dd-#{year}-#{round}-pitstops.json", fn() -> get_pitstops(year, round) end
    drivers = with_cached_file "dd-#{year}-#{round}-drivers.json", fn() -> get_drivers(year) end
    constructors = with_cached_file "dd-#{year}-constructors.json", fn() -> get_constructors(year) end

    data_filename = "dd-f1-#{year}-#{round}.json"
    chart_data = DataConverter.convert_data(results, laps, pitstops, drivers)

    qdata = get_qualy_results(year, round)

    File.write(data_filename, Poison.encode!(%{chart_data: chart_data, qdata: qdata, constructors: constructors, tire_data: tire_data}), [:binary])
    File.write("dd-f1-#{year}-#{round}.html", EEx.eval_file("laps.html.eex", [year: year, round: round, data_src: data_filename]))
  end


  def with_cached_file(filepath, func) do
    case File.exists? filepath do
      false ->
        IO.puts "Getting data..."
        data = func.()
        IO.puts "Putting data to file #{filepath}"
        File.write!(filepath, Poison.encode!(data), [:binary])
        data
      true ->
        IO.puts "Getting data from file #{filepath}"
        Poison.decode!(File.read!(filepath))
    end
  end

  def get_tire_data(year, round) do
    url = "http://www.motorsport-total.com/f1/ergeb/#{year}/#{round |> String.rjust(2, ?0)}/75ts.shtml"
    IO.inspect url
    html = get_html(url)
    table = hd(Floki.find(html, "table.table1"))
    # IO.inspect table
    {"table", _attributes, children} = table
    # IO.inspect children

    Floki.find(html, "table.table1 tr") 
    |> Enum.filter(fn(node) ->  
      case node do
        # manufacturer row
        {"tr", _, [{"td", [{"colspan", "7"} | _], _} | _]} -> false
        # header row
        {"tr", _, [{"th", _, _} | _]} -> false
        # interesting row
        {"tr", _, _} -> true
        # anything else
        _ -> false
      end
    end)
    |> Enum.reduce(%{}, fn(tr, map) ->       
      {"tr", _, tds} = tr
      [first_td | tds] = tds
      case first_td do
        {"td", _, [{"a", _, [driver_name]}]} -> 

          tires = Enum.map(tds, fn(td) -> 
            {"td", _, [x]} = td
            x = Regex.replace(~r/ ?\(DNF\)/, x, "")
            x = Map.get(%{
              "SW" => "SS",
              "W" => "S",
              "M" => "M",
              "H" => "H",
              "I" => "I",
              "R" => "R",
              " " => nil,
              "" => nil
            }, x)
          end) |> Enum.filter(&(&1 != nil))

          driver_name = :unicode.characters_to_binary(driver_name, :latin1, :utf8)
          driver_name = Regex.replace(~r/^.\. +/, driver_name, "")
          Map.put map, driver_name, tires
        _ -> map
      end
    end)
    |> IO.inspect
  end

  def get_results(year, round) do
    url = "http://ergast.com/api/f1/#{year}/#{round}/results.json"
    parsed = getJSON(url)
    hd(parsed["MRData"]["RaceTable"]["Races"])["Results"]
  end

  def get_qualy_results(year, round) do
    url = "http://ergast.com/api/f1/#{year}/#{round}/qualifying.json"
    parsed = getJSON(url)
    results = hd(parsed["MRData"]["RaceTable"]["Races"])["QualifyingResults"]
    results |> process_qualy_data
  end

  def get_constructors(year) do
    url = "http://ergast.com/api/f1/#{year}/constructors.json"
    parsed = getJSON(url)
    constructors = parsed["MRData"]["ConstructorTable"]["Constructors"] 
    |> Enum.map(&( &1["constructorId"] ))
  end

  def get_drivers(year) do
    url = "http://ergast.com/api/f1/#{year}/drivers.json"
    parsed = getJSON(url)
    parsed["MRData"]["DriverTable"]["Drivers"]
  end




  def get_laps(year, round) do
    base_url = "http://ergast.com/api/f1/#{year}/#{round}/laps.json?limit=#{@max_respone_rows}"
    do_get_laps(base_url)
  end
  def do_get_laps(base_url) do
    do_get_laps(base_url, 0, -1, [])
  end
  def do_get_laps(base_url, total_rows, rows_obtained, laps) when rows_obtained < total_rows do
    url = case rows_obtained do
      -1 -> base_url
      _ -> "#{base_url}&offset=#{rows_obtained+1}"
    end
    IO.inspect [url, rows_obtained, total_rows]
    parsed = getJSON(url)
    {total_rows, _} = Integer.parse(parsed["MRData"]["total"])
    rows_obtained = rows_obtained + @max_respone_rows;
    laps = case parsed["MRData"]["RaceTable"]["Races"] do
      [] -> laps
      [race | _rest] -> laps ++ race["Laps"]
    end
    do_get_laps(base_url, total_rows, rows_obtained, laps)
  end
  def do_get_laps(_base_url, _total_rows, _rows_obtained, laps) do
    laps
  end

  def get_pitstops(year, round) do
    base_url = "http://ergast.com/api/f1/#{year}/#{round}/pitstops/~w.json?limit=#{@max_respone_rows}"
    do_get_pitstops(base_url, 1, [])
  end
  def do_get_pitstops(base_url, current_pitstop, list) do
    # do_get_pitstops(base_url, 0, -1, [])
    url = :io_lib.format base_url, [current_pitstop]
    IO.puts url
    parsed = getJSON(url)
    case parsed["MRData"]["RaceTable"]["Races"] do
      [] -> list
      [race | _rest] -> do_get_pitstops(base_url, current_pitstop + 1, list ++ race["PitStops"])
    end
  end

  def get_html(url) do
    {:ok, %HTTPoison.Response{status_code: 200, body: body}} = HTTPoison.get(url, [], [recv_timeout: 3600000, timeout: 3600000])
    body
  end

  def getJSON(url) do
    {:ok, %HTTPoison.Response{status_code: 200, body: body}} = HTTPoison.get(url, [], [recv_timeout: 3600000, timeout: 3600000])
    Poison.Parser.parse! body
  end

  def process_qualy_data(e) do
    e |> Enum.map(&( %{
        position: &1["position"], 
        driver: &1["Driver"]["code"],
        constructor: &1["Constructor"]["constructorId"],
        name: [&1["Driver"]["givenName"], &1["Driver"]["familyName"]] |> Enum.join(" "),
        last_name: &1["Driver"]["familyName"],
        q1: strtosecs(&1["Q1"]),
        q2: strtosecs(&1["Q2"]),
        q3: strtosecs(&1["Q3"]),
        time: [strtosecs(&1["Q1"]), strtosecs(&1["Q2"]), strtosecs(&1["Q3"])] |> Enum.filter(fn(x)-> x != nil end),
      }
    ))
  end

  def filter_by_q(e, str) do
    e |> Enum.filter(&( &1[str] != nil ))
  end

  # def calc(e, str) do
  #   e |> Enum.map(&( %{
  #       position: &1["position"], 
  #       driver: &1["Driver"]["code"],
  #       constructor: &1["Constructor"]["constructorId"],
  #       name: [&1["Driver"]["givenName"], &1["Driver"]["familyName"]] |> Enum.join(" "),
  #       last_name: &1["Driver"]["familyName"],
  #       time: strtosecs(&1[str]), 
  #       q1: strtosecs(&1["Q1"]), 
  #       q2: strtosecs(&1["Q2"]), 
  #       q3: strtosecs(&1["Q3"]),
  #       fastest: nil
  #     }
  #   ))
  #   |> Enum.map(&( %{ &1 |
  #       fastest: Enum.min([ &1[:q1], &1[:q3], &1[:q2] ])
  #     }
  #   ))
  # end

  def parse_args(args) do
    {options, _, _} = OptionParser.parse(args,
      switches: [year: :string, round: :string, type: :string]
    )
    options
  end

  # def gettime(d) do
  #   time = case d["Q3"] do
  #     nil -> case d["Q2"] do
  #         nil -> d["Q1"]
  #         time -> time
  #       end
  #     time ->
  #       time
  #   end
  #   strtosecs(time)
  # end

  def strtosecs(nil) do
    nil
  end
  def strtosecs("") do
    nil
  end
  def strtosecs(str) do
    re = ~r/(\d+):(\d+.\d+)/
    [_, minutes, seconds] = Regex.run(re, str)
    {minutes, _} = Integer.parse(minutes)
    {seconds, _} = Float.parse(seconds)
    0.0 + (minutes * 60) + seconds
  end

  def getq(d) do
    case d["Q3"] do
      nil -> case d["Q2"] do
          nil -> "Q1"
          _ -> "Q2"
        end
      _ ->
        "Q3"
    end
  end

  def boilerplate do

  end


end
