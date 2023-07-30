import Hubot from "hubot";

export type Middleware = (context: Hubot.MiddlewareContext, next: Hubot.NextFunction, done: Hubot.DoneFunction) => void

export class MiddlewareEmulator {
  private registrations: Middleware[] = [];

  register(m: Middleware) {
    this.registrations.push(m);
  }

  execute(response: Hubot.Response) {
    var context: Hubot.MiddlewareContext = {
      response
    };

    var promise = new Promise<void>(resolve => {
      let i = -1;
      let mainDone = () => {
        resolve();
      };
      let next = (done: Hubot.DoneFunction) => {
        i++;
        if (i >= this.registrations.length) {
          if (done)
            done();
          else
            mainDone();
        }

        let n = this.registrations[i];
        n(context, next, done);
      };

      next(mainDone);
    });

    return promise;
  }
}
