import React, { useState, useEffect } from 'react';
import assets from '../assets/assets';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const ChangelogPanel = ({ isOpen, onClose }) => {
    const { axios } = useContext(AuthContext);
    const [selectedVersion, setSelectedVersion] = useState(null);

    // MODIFIED: Fetch changelog data from API
    const { data: changelog = [], isLoading } = useQuery({
        queryKey: ['changelog'],
        queryFn: async () => {
            const { data } = await axios.get('/api/changelog');
            return data.changelog || [];
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
    });

    // Group changes by version
    const versions = changelog.reduce((acc, item) => {
        if (!acc[item.version]) {
            acc[item.version] = [];
        }
        acc[item.version].push(item);
        return acc;
    }, {});

    // Set latest version as selected by default
    useEffect(() => {
        if (changelog.length > 0 && !selectedVersion) {
            const latestVersion = changelog[0].version;
            setSelectedVersion(latestVersion);
        }
    }, [changelog, selectedVersion]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <img src={assets.code} alt="Changelog" className="w-8 h-8" />
                            Development Changelog
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Latest updates, improvements, and bug fixes
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="flex h-[calc(80vh-120px)]">
                    {/* Version List */}
                    <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">Versions</h3>
                            {Object.keys(versions).map((version) => (
                                <div
                                    key={version}
                                    onClick={() => setSelectedVersion(version)}
                                    className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${selectedVersion === version
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                        }`}
                                >
                                    <div className="font-medium">v{version}</div>
                                    <div className="text-xs opacity-75">
                                        {new Date(versions[version][0].date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Change Details */}
                    <div className="w-2/3 overflow-y-auto p-6">
                        {selectedVersion && versions[selectedVersion] && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">
                                        Version {selectedVersion}
                                    </h3>
                                    <span className="text-gray-400 text-sm">
                                        {new Date(versions[selectedVersion][0].date).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Group changes by type */}
                                {['feature', 'improvement', 'bugfix', 'security', 'performance'].map((type) => {
                                    const typeChanges = versions[selectedVersion].filter(
                                        (change) => change.type === type
                                    );

                                    if (typeChanges.length === 0) return null;

                                    const typeConfig = {
                                        feature: { title: '🚀 New Features', color: 'text-green-400' },
                                        improvement: { title: '✨ Improvements', color: 'text-blue-400' },
                                        bugfix: { title: '🐛 Bug Fixes', color: 'text-yellow-400' },
                                        security: { title: '🔒 Security', color: 'text-red-400' },
                                        performance: { title: '⚡ Performance', color: 'text-purple-400' },
                                    };

                                    return (
                                        <div key={type} className="mb-6">
                                            <h4 className={`font-semibold mb-3 ${typeConfig[type].color}`}>
                                                {typeConfig[type].title}
                                            </h4>
                                            <ul className="space-y-2">
                                                {typeChanges.map((change, index) => (
                                                    <li key={index} className="flex items-start gap-3 text-gray-300">
                                                        <span className="text-xs mt-1">•</span>
                                                        <span className="text-sm leading-relaxed">{change.description}</span>
                                                        {change.breaking && (
                                                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded ml-2">
                                                                Breaking
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangelogPanel;