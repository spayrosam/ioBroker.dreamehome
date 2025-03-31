const { expect } = require("@jest/globals");
const Json2iob = require("../dist/index");
const fs = require("fs");
const path = require("path");
function loadJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading the JSON file:", error);
    return null;
  }
}

const mockIoBroker = {
  states: {},
  objects: {},
  log: {
    error: (message) => console.error("ERROR:", message),
    info: (message) => console.log("INFO:", message),
    debug: (message) => console.debug("DEBUG:", message),
  },
  setStateAsync: async function (key, value) {
    this.states[key] = value;
    return Promise.resolve();
  },
  extendObjectAsync: async function (id, obj) {
    this.objects[id] = { ...obj, id };
    return Promise.resolve();
  },
};

function formatTree(data, prefix = "") {
  let output = "";
  for (const [key, value] of Object.entries(data)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      output += `${fullPath}:\n`;
      output += formatTree(value, fullPath);
    } else {
      output += `${fullPath}: ${value}\n`;
    }
  }
  return output;
}

// Jest test case
describe("Json2iob", () => {
  test("should correctly parse JSON", async () => {
    const sampleJsonPath = path.join(__dirname, "sample.json");

    // Ensure the JSON data is loaded correctly
    const sampleJson = loadJSON(sampleJsonPath);
    expect(sampleJson).not.toBeNull();

    // Create an instance of Json2iob
    const adapter = new Json2iob(mockIoBroker);

    // Parse the JSON data
    await adapter.parse("test", sampleJson, { write: true });

    // Generate tree-like structure for states
    console.log("Final states in tree format:");
    console.log(formatTree(mockIoBroker.states));

    // Use Jest snapshot to capture the current state of mockIoBroker.objects and mockIoBroker.states
    expect(mockIoBroker.objects).toMatchSnapshot();
    expect(mockIoBroker.states).toMatchSnapshot();
  });
});
