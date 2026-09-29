import { reportCrash, setCrashSink } from '../crashReporter';

describe('crashReporter', () => {
  it('forwards the error and where it was caught to the configured sink', () => {
    const sink = jest.fn();
    setCrashSink(sink);

    const error = new Error('boom');
    reportCrash(error, { where: 'route:(app)', extra: { pathname: '/home' } });

    expect(sink).toHaveBeenCalledWith(error, { where: 'route:(app)', extra: { pathname: '/home' } });
  });

  it('never throws when the sink itself fails', () => {
    setCrashSink(() => {
      throw new Error('sink down');
    });

    expect(() => reportCrash(new Error('boom'), { where: 'test' })).not.toThrow();
  });
});
