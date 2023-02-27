import { skywaterParams } from "./params";
import { nfet18 } from "./nfet18";
import { pfet18 } from "./pfet18";
import { pfet18_hvt } from "./pfet18_hvt";

export const models = skywaterParams + "\n\n" + nfet18 + "\n\n" + pfet18 + "\n\n" + pfet18_hvt;
