import { motion, AnimatePresence } from 'framer-motion';
import { X, Code2, Search, TestTube2, GitPullRequest } from 'lucide-react';

const agentDataMap = {
  research: { title: 'Research Details', icon: Search, data: 'Issue #42: Login failing on Safari. Gathered 5 files.' },
  coding: { title: 'Generated Patch', icon: Code2, data: 'function login(usr, pwd) {\n  return api.auth(usr, pwd);\n}' },
  testing: { title: 'Test Results', icon: TestTube2, data: '✅ PASS login.test.js\n✅ PASS auth.js\nCoverage: 98%' },
  pr: { title: 'Pull Request', icon: GitPullRequest, data: 'PR #43 Created: Fix Safari login issues\nStatus: Pending Review' }
};

export default function DetailsDrawer({ node, onClose }) {
  const content = node ? agentDataMap[node.type] : null;
  const Icon = content?.icon;

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-96 glass-card border-l border-white/10 z-50 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-3">
                {Icon && <Icon className="text-blue-400" size={20} />}
                <h2 className="text-lg font-semibold text-white">{content?.title || 'Details'}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-gray-300">
              {node.state === 'running' ? (
                <div className="flex items-center gap-3 text-blue-400 animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"/>
                  Processing data...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{content?.data || 'No extended data available.'}</pre>
              )}
            </div>
            
            <div className="p-4 bg-black/40 border-t border-white/10 text-xs text-center text-gray-500">
              Node ID: {node.id} — State: {node.state.toUpperCase()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
