import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

export async function strict_output(
  system_prompt: string,
  user_prompt: string | string[],
  output_format: OutputFormat,
  default_category: string = "",
  output_value_only: boolean = false,
  model: string = "gpt-3.5-turbo",
  temperature: number = 1,
  num_tries: number = 3,
  verbose: boolean = false
): Promise<any> {
  const list_input = Array.isArray(user_prompt);
  const dynamic_elements = /<.*?>/.test(JSON.stringify(output_format));
  const list_output = /\[.*?\]/.test(JSON.stringify(output_format));
  let error_msg = "";

  for (let i = 0; i < num_tries; i++) {
    let output_format_prompt = `\nYou are to output the following in json format: ${JSON.stringify(output_format)}. \nDo not put quotation marks or escape character \\ in the output fields.`;

    if (list_output) {
      output_format_prompt += `\nIf output field is a list, classify output into the best element of the list.`;
    }
    if (dynamic_elements) {
      output_format_prompt += `\nAny text enclosed by < and > indicates you must generate content to replace it. Example input: Go to <location>, Example output: Go to the garden\nAny output key containing < and > indicates you must generate the key name to replace it. Example input: {'<location>': 'description of location'}, Example output: {school: a place for education}`;
    }
    if (list_input) {
      output_format_prompt += `\nGenerate a list of json, one json for each input element.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model,
        temperature,
        messages: [
          {
            role: "system",
            content: system_prompt + output_format_prompt + error_msg,
          },
          {
            role: "user",
            content: Array.isArray(user_prompt) ? user_prompt.join('\n') : user_prompt,
          },
        ],
      });

      let res = response.choices[0].message.content!.replace(/'/g, '"');
      res = res.replace(/(\w)"(\w)/g, "$1'$2");
      res = res.replace(/```json\n?/, '').replace(/```\n?/, '');

      if (verbose) {
        console.log("System prompt:", system_prompt + output_format_prompt + error_msg);
        console.log("\nUser prompt:", user_prompt);
        console.log("\nGPT response:", res);
      }

      let output: any = JSON.parse(res);
      if (list_input) {
        if (!Array.isArray(output)) {
          throw new Error("Output format not in a list of json");
        }
      } else {
        output = [output];
      }

      // Process each output element
      for (let index = 0; index < output.length; index++) {
        for (const key in output_format) {
          if (/<.*?>/.test(key)) continue;

          if (!(key in output[index])) {
            throw new Error(`${key} not in json output`);
          }

          if (Array.isArray(output_format[key])) {
            const choices = output_format[key] as string[];
            if (Array.isArray(output[index][key])) {
              output[index][key] = output[index][key][0];
            }
            if (!choices.includes(output[index][key]) && default_category) {
              output[index][key] = default_category;
            }
            if (output[index][key].includes(":")) {
              output[index][key] = output[index][key].split(":")[0];
            }
          }
        }

        if (output_value_only) {
          output[index] = Object.values(output[index]);
          if (output[index].length === 1) {
            output[index] = output[index][0];
          }
        }
      }

      return list_input ? output : output[0];

    } catch (e) {
      error_msg = `\n\nResult: ${e}\n\nError message: ${e}`;
      console.log("An exception occurred:", e);
      if (i === num_tries - 1) throw e;
    }
  }

  return [];
}

export async function getQuizQuestion(topic: string) {
  const systemPrompt = "You are a quiz generator. Create multiple-choice questions with short, concise answers. The correct answer should be a single word or very short phrase.";
  
  const format = {
    question: "string",
    options: ["string", "string", "string", "string"],
    answer: "string"  // This should be just the correct answer word/phrase
  };

  const response = await strict_output(
    systemPrompt,
    `Generate a multiple choice question about ${topic}`,
    format,
    "",     // default_category
    false,  // output_value_only
    "gpt-3.5-turbo",
    0.7,    // Lower temperature for more focused responses
    3       // num_tries
  );

  return response;
}

export async function getOpenEndedQuestion(topic: string) {
  const systemPrompt = "You are a quiz generator. Create open-ended questions. The answer must be a single word or very short phrase (maximum 2-3 words). Never provide explanations in the answer.";
  
  const format = {
    question: "string",
    answer: "string" // Will contain just the word/short phrase
  };

  const response = await strict_output(
    systemPrompt,
    `Generate an open-ended question about ${topic}. The answer must be a single word or very short phrase.`,
    format,
    "",     // default_category
    false,  // output_value_only
    "gpt-3.5-turbo",
    0.5,    // Even lower temperature for more precise responses
    3       // num_tries
  );

  return response;
}

export default openai;
