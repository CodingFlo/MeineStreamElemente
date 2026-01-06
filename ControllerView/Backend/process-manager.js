const child_process = require('child_process');
const trackedChildren = new Set();

function trackChild(child) {
    if (!child || !child.pid) return;
    trackedChildren.add(child);
    const remove = () => trackedChildren.delete(child);
    child.on('exit', remove);
    child.on('close', remove);
}

// Monkey-Patching
try {
    const methods = ['spawn', 'exec', 'execFile', 'fork'];
    methods.forEach(method => {
        const original = child_process[method];
        child_process[method] = function () {
            const child = original.apply(this, arguments);
            trackChild(child);
            return child;
        };
    });
} catch (e) {
    console.warn('Child_process Patch failed', e.message);
}

function killAllChildren() {
    for (const child of trackedChildren) {
        try {
            if (process.platform === 'win32') {
                child_process.spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
            } else {
                process.kill(child.pid, 'SIGKILL');
            }
        } catch (e) { }
    }
}

module.exports = { killAllChildren };