import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="mx-auto max-w-lg p-6 pt-24"><h1 className="text-title">页面暂时没能打开</h1>
      <p className="my-4 text-muted">本机记录没有被清空。请刷新后重试。</p><button className="btn btn-primary" onClick={() => window.location.reload()}>重新打开</button></main>;
  }
}
