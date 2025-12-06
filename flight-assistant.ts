import OpenAI from "openai";
import readline from "readline";
import { config } from "dotenv";

config();

interface IFlight {
  number: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
}

const flights: IFlight[] = [
  {
    number: "12",
    origin: "Belém-PA",
    destination: "São Paulo-SP",
    departureTime: "08:00",
    arrivalTime: "12:30",
  },
  {
    number: "1212",
    origin: "Belém-PA",
    destination: "São Paulo-SP",
    departureTime: "14:00",
    arrivalTime: "18:30",
  },
  {
    number: "34",
    origin: "São Paulo-SP",
    destination: "Belém-PA",
    departureTime: "10:00",
    arrivalTime: "14:30",
  },
  {
    number: "3434",
    origin: "São Paulo-SP",
    destination: "Belém-PA",
    departureTime: "16:00",
    arrivalTime: "20:30",
  },
  {
    number: "56",
    origin: "Rio de Janeiro-RJ",
    destination: "Brasília-DF",
    departureTime: "07:00",
    arrivalTime: "09:00",
  },
  {
    number: "5656",
    origin: "Rio de Janeiro-RJ",
    destination: "Brasília-DF",
    departureTime: "19:00",
    arrivalTime: "21:00",
  },
  {
    number: "78",
    origin: "Brasília-DF",
    destination: "Rio de Janeiro-RJ",
    departureTime: "11:00",
    arrivalTime: "13:00",
  },
  {
    number: "7878",
    origin: "Brasília-DF",
    destination: "Rio de Janeiro-RJ",
    departureTime: "22:00",
    arrivalTime: "00:00",
  },
  {
    number: "90",
    origin: "Salvador-BA",
    destination: "Recife-PE",
    departureTime: "06:30",
    arrivalTime: "08:00",
  },
  {
    number: "9090",
    origin: "Salvador-BA",
    destination: "Recife-PE",
    departureTime: "15:30",
    arrivalTime: "17:00",
  },
  {
    number: "21",
    origin: "Recife-PE",
    destination: "Salvador-BA",
    departureTime: "09:00",
    arrivalTime: "10:30",
  },
  {
    number: "2121",
    origin: "Recife-PE",
    destination: "Salvador-BA",
    departureTime: "18:00",
    arrivalTime: "19:30",
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const findFlights = (origin: string, destination: string) => {
  return flights.filter(
    (flight) =>
      flight.origin.includes(origin) && flight.destination.includes(destination)
  );
};

const makeRegistration = (number: string): IFlight | undefined => {
  return flights.find((flight) => flight.number === number);
};

async function FlightAssistant(answer: string) {
  if (answer.toLowerCase() === "sair" || answer.toLowerCase() === "exit") {
    console.log("Encerrando assistente...");
    rl.close();
    return;
  }

  const api = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are an assistant that searches for and schedules flights. Only answer questions related to this and nothing outside this context.",
    },
    {
      role: "user",
      content: answer,
    },
  ];

  const toolResponse = await api.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    tools: [
      {
        type: "function",
        function: {
          name: "findFlights",
          description: "Returns the available flights.",
          parameters: {
            type: "object",
            properties: {
              origin: {
                type: "string",
                description: "The origin city of the flight",
              },
              destination: {
                type: "string",
                description: "The destination city of the flight",
              },
            },
            required: ["origin", "destination"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "makeReservation",
          description: "Make a reservation for a flight",
          parameters: {
            type: "object",
            properties: {
              flightNumber: {
                type: "string",
                description: "The number of the flight to reserve",
              },
            },
            required: ["flightNumber"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  const toolFunction = toolResponse.choices[0].message.tool_calls?.[0];
  if (toolFunction) {
    if (toolFunction.type === "function") {
      const toolName = toolFunction.function.name;
      const args = JSON.parse(toolFunction.function.arguments);
      if (toolName === "findFlights") {
        const results = findFlights(args.origin, args.destination);
        messages.push({
          role: "system",
          content:
            "The tool has provided the available flights. Show them in a list. If there are no results, report that nothing was found. Important: You must be able to identify cities, states, and countries regardless of how the user mentions them. For Brazilian states, all locations follow the pattern 'City-State' (e.g., Belém-PA, São Paulo-SP). Match user queries intelligently to these location formats.",
        });
        messages.push(toolResponse.choices[0].message);
        messages.push({
          role: "tool",
          content: JSON.stringify(results),
          tool_call_id: toolFunction.id,
        });
      }
      if (toolName === "makeReservation") {
        const results = makeRegistration(args.flightNumber);
        messages.push({
          role: "system",
          content:
            "Provide more information about the selected flight number. If there are no results, report that nothing was found.",
        });
        messages.push(toolResponse.choices[0].message);
        messages.push({
          role: "tool",
          content: JSON.stringify(results),
          tool_call_id: toolFunction.id,
        });
      }
    }
  }

  const llmResponse = await api.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
  });
  console.log(llmResponse.choices[0].message.content);
  console.log("\n");

  rl.question("Digite (ou 'sair' para encerrar): ", FlightAssistant);
}

rl.question("Digite: ", FlightAssistant);
