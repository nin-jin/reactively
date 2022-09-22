import { perfTests } from "../../test/src/util/PerfTests";
import { withPerf } from "./CypressPerfUtil";

const tests = perfTests({
  withPerf,
  collectGarbage: () => {},
  optimizeFunctionOnNextCall: () => {},
});

tests.forEach(({ name, run, config, testPullCounts }) => {
  it(name, () => {
    const result = run();
    const { expected } = config;
    expect(result.sum).equals(expected.sum);
    if (config.readNth === 1 || testPullCounts) {
      expect(result.count).equals(expected.count);
    }
  });
});
