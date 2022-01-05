// import {
//   NotebookCell,
//   NotebookCellOutput,
//   NotebookCellOutputItem,
//   NotebookController,
//   NotebookDocument,
//   notebooks,
// } from "vscode";
// import { spawn } from "child_process";

// export default class Controller {
//   readonly controllerId = "bash-notebook-controller-id";
//   readonly notebookType = "bash-notebook";
//   readonly label = "My Notebook";
//   readonly supportedLanguages = ["shellscript"];

//   private readonly _controller: NotebookController;
//   private _executionOrder = 0;

//   constructor() {
//     this._controller = notebooks.createNotebookController(
//       this.controllerId,
//       this.notebookType,
//       this.label
//     );

//     this._controller.supportedLanguages = this.supportedLanguages;
//     this._controller.supportsExecutionOrder = true;
//     this._controller.executeHandler = this._execute.bind(this);
//   }

//   dispose() {
//     this._controller.dispose();
//   }

//   private _execute(
//     cells: NotebookCell[],
//     _notebook: NotebookDocument,
//     _controller: NotebookController
//   ) {
//     for (const cell of cells) {
//       this._doExecution(cell);
//     }
//   }

//   private async _doExecution(cell: NotebookCell): Promise<void> {
//     const execution = this._controller.createNotebookCellExecution(cell);
//     execution.executionOrder = ++this._executionOrder;
//     execution.start(Date.now());

//     const text = cell.document.getText();
//     const textParts = text.split(" ");
//     const command = textParts[0];
//     const args = textParts.slice(1);

//     console.log(command, args);

//     const child = spawn(command, args, {
//       // cwd: process.cwd
//       // shell: "C:\\WINDOWS\\system32\\wsl.exe",
//       shell: "C:\\Program Files\\Git\\bin\\bash.exe",
//     });
//     // ComSpec:'C:\\WINDOWS\\system32\\cmd.exe'

//     const outData: string[] = [];
//     const errorData: string[] = [];

//     child.stdout.on("data", (data: string) => {
//       outData.push(data);
//     });

//     child.stderr.on("data", (data: string) => {
//       errorData.push(data);
//     });

//     child.on("error", (error: string) => {
//       errorData.push(error);
//     });

//     child.on("close", (code) => {
//       const items: NotebookCellOutputItem[] = [];
//       if (outData.length) {
//         items.push(NotebookCellOutputItem.text(outData.join("")));
//       }
//       if (errorData.length) {
//         items.push(NotebookCellOutputItem.text(errorData.join("")));
//       }
//       execution.replaceOutput(new NotebookCellOutput(items));

//       const success = !code && !errorData.length;
//       execution.end(success, Date.now());
//     });
//   }
// }

import {
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookController,
  NotebookDocument,
  notebooks,
} from "vscode";
import { createShell } from "./Shell";

export default class Controller {
  readonly controllerId = "bash-notebook-controller-id";
  readonly notebookType = "bash-notebook";
  readonly label = "Bash notebook";
  readonly supportedLanguages = ["shellscript"];

  private readonly controller: NotebookController;
  private executionOrder = 0;
  private shells;

  constructor() {
    this.controller = notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label
    );

    this.controller.supportedLanguages = this.supportedLanguages;
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.execute.bind(this);
    this.shells = new Map();
  }

  dispose() {
    this.controller.dispose();
    this.shells.forEach((shell) => shell.dispose());
  }

  private execute(
    cells: NotebookCell[],
    _notebook: NotebookDocument,
    _controller: NotebookController
  ) {
    for (const cell of cells) {
      this.doExecution(cell);
    }
  }

  private getShell(cell: NotebookCell) {
    if (!this.shells.has(cell)) {
      this.shells.set(cell, createShell());
    }
    return this.shells.get(cell);
  }

  private async doExecution(cell: NotebookCell): Promise<void> {
    const execution = this.controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this.executionOrder;
    execution.start(Date.now());

    const shell = this.getShell(cell);
    const text = cell.document.getText();

    shell
      .run(text)
      .then((result: string) => {
        execution.replaceOutput(
          new NotebookCellOutput([NotebookCellOutputItem.text(result)])
        );
        execution.end(true, Date.now());
      })
      .catch((error: string) => {
        execution.replaceOutput(
          new NotebookCellOutput([NotebookCellOutputItem.text(error)])
        );
        execution.end(false, Date.now());
      });
  }
}
