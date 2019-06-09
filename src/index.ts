import "core-js/stable";
import "regenerator-runtime/runtime";

import STRING from "./data.string.json";
import Data, { fetchAllData } from "./data";
import updateInfo from "./old";

declare var data: Data | null;

data = null;

fetchAllData().then(result => {
    data = result;
    data.string = STRING;
    updateInfo();
});
