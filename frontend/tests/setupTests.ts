import "@testing-library/jest-dom";
import "whatwg-fetch";
import { TextDecoder, TextEncoder } from "util";

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}
