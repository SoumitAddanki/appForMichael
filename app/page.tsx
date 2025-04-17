'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Video = {
  id: string;
  title: string;
  description: string;
  videoYTId: string;
  sectionTitle: string;
  watched_fully: boolean;
  skill: number;
};

type Section = {
  id: string;
  name: string;
};

type Tag = {
  id: number;
  tag: string;
  videoId: string;
};

function TagsList({ videoId }: { videoId: string }) {
  const [videoTags, setVideoTags] = useState<string[]>([]);
  useEffect(() => {
    supabase
      .from('video_tag') // correct table name
      .select('tag')
      .eq('videoId', videoId) // correct column name
      .then(({ data }) => setVideoTags(data ? data.map(t => t.tag) : []));
  }, [videoId]);
  return (
    <div className="flex flex-wrap gap-1">
      {videoTags.map(tag => (
        <span key={tag} className="bg-[#27272f] px-2 py-0.5 text-xs rounded">
          {tag}
        </span>
      ))}
    </div>
  );
}


// Status pill color mapping
const statusStyles: Record<string, string> = {
  'In Progress': 'text-blue-400',
  'Complete': 'text-green-400',
  'Pending': 'text-cyan-300',
  'Approved': 'text-yellow-300',
  'Rejected': 'text-gray-400',
};
const statusDot: Record<string, string> = {
  'In Progress': 'bg-blue-400',
  'Complete': 'bg-green-400',
  'Pending': 'bg-cyan-300',
  'Approved': 'bg-yellow-300',
  'Rejected': 'bg-gray-400',
};
const statusList = [
  { status: 'In Progress', date: 'Just now' },
  { status: 'Complete', date: 'A minute ago' },
  { status: 'Pending', date: '1 hour ago' },
  { status: 'Approved', date: 'Yesterday' },
  { status: 'Rejected', date: 'Feb 2, 2025' },
  { status: 'In Progress', date: 'Just now' },
  { status: 'Complete', date: 'A minute ago' },
  { status: 'Pending', date: '1 hour ago' },
  { status: 'Approved', date: 'Yesterday' },
  { status: 'Rejected', date: 'Feb 2, 2025' },
];

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<Omit<Video, 'id'>>({
    title: '',
    description: '',
    videoYTId: '',
    sectionTitle: '',
    watched_fully: false,
    skill: 1,
  });

  // Fetch data
  const fetchVideos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('id', { ascending: false });
    if (data) setVideos(data);
    setLoading(false);
  };
  const fetchSections = async () => {
    const { data } = await supabase.from('sections').select('*');
    if (data) setSections(data);
  };

  useEffect(() => {
    fetchVideos();
    fetchSections();
  }, []);

  // Open Add vs Edit
  const openAddModal = () => {
    setEditingVideo(null);
    setForm({
      title: '',
      description: '',
      videoYTId: '',
      sectionTitle: '',
      watched_fully: false,
      skill: 1,
    });
    setTags([]);
    setSelectedSections([]);
    setErrorMsg(null);
    setIsModalOpen(true);
  };
  const openEditModal = async (video: Video) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      description: video.description,
      videoYTId: video.videoYTId,
      sectionTitle: video.sectionTitle,
      watched_fully: video.watched_fully,
      skill: video.skill,
    });
    // load its tags
    const { data: tagData } = await supabase
      .from<Tag>('video_tag')
      .select('tag')
      .eq('videoId', video.id);
    setTags(tagData?.map((t) => t.tag) || []);
    // load its sections
    const { data: rels } = await supabase
      .from('section_videos')
      .select('section_id')
      .eq('video_id', video.id);
    setSelectedSections(rels?.map((r) => r.section_id) || []);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // tag logic
  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // section checkbox
  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Submit handlers
  const handleSubmit = (e: React.FormEvent) =>
    editingVideo ? updateVideo(e) : addVideo(e);

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    const { data: video, error } = await supabase
      .from<Video>('videos')
      .insert([{
        title:      form.title,
        description:form.description,
        videoYTId:  form.videoYTId,
        sectionTitle: form.sectionTitle,
        watched_fully: form.watched_fully,
        skill:      form.skill,
      }])
      .select()
      .single();

    if (error || !video) {
      setErrorMsg(error?.message || 'Insert failed');
      setIsSaving(false);
      return;
    }

    await syncTagsAndSections(video.id);
    await fetchVideos();
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const updateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    setIsSaving(true);
    setErrorMsg(null);

    const { data: updated, error } = await supabase
      .from<Video>('videos')
      .update(
        {
          title:         form.title,
          description:   form.description,
          videoYTId:     form.videoYTId,
          sectionTitle:  form.sectionTitle,
          watched_fully: form.watched_fully,
          skill:         form.skill,
        },
        { returning: 'representation' }
      )
      .eq('id', editingVideo.id)
      .select()
      .single();

    if (error) {
      setErrorMsg(error.message);
      setIsSaving(false);
      return;
    }

    await syncTagsAndSections(editingVideo.id);
    await fetchVideos();
    setEditingVideo(null);
    setIsSaving(false);
    setIsModalOpen(false);
  };

  // Delete selected videos
  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    await supabase.from('videos').delete().in('id', selectedIds);
    setSelectedIds([]);
    fetchVideos();
  };

  // helper to sync tags & sections
  const syncTagsAndSections = async (videoId: string) => {
    await supabase.from('video_tag').delete().eq('videoId', videoId);
    if (tags.length) {
      await supabase.from('video_tag').insert(
        tags.map((tag) => ({ videoId, tag }))
      );
    }
    await supabase.from('section_videos').delete().eq('videoId', videoId);
    if (selectedSections.length) {
      await supabase.from('section_videos').insert(
        selectedSections.map((sid) => ({
          video_id: videoId,
          section_id: sid,
        }))
      );
    }
  };

  // Recommendation level based on skill or section
  const getRecommendationLevel = (video: Video, idx: number) => {
    if (video.skill === 3) return 'Advanced';
    if (video.skill === 2) return 'Intermediate';
    if (video.skill === 1) return 'Beginner';
    return idx % 2 === 0 ? 'Beginner' : 'Intermediate';
  };

  // Sidebar nav items
  const sidebarNav = [
    {
      section: 'Favorites',
      items: [
        { name: 'Overview' },
        { name: 'Projects' },
      ],
    },
    {
      section: 'Dashboards',
      items: [
        { name: 'Home', active: true },
        { name: 'Files'},
      ],
    },
    {
      section: 'Pages',
      items: [
        { name: 'User Profile'},
        { name: 'Overview' },
        { name: 'Projects' },
        { name: 'Campaigns' },
        { name: 'Documents' },
        { name: 'Followers' },
        { name: 'Account' },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#18181b] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#232329] p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-500 to-gray-800 border-2 border-gray-700"></div>
          <span className="font-bold text-lg">Michael Dutro</span>
        </div>
        {sidebarNav.map((section) => (
          <div key={section.section} className="mb-8">
            <div className="text-xs uppercase text-gray-400 mb-2">{section.section}</div>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.name}>
                  <div
                    className={`flex items-center px-3 py-2 rounded-lg cursor-pointer ${
                      item.active
                        ? 'bg-[#323236] text-white font-semibold'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.name}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 p-0">
        {/* Top Bar */}
        <div className="flex items-center gap-3 text-gray-400 px-10 pt-7 pb-2">
          <span className="text-xl">★</span>
          <span className="font-semibold text-gray-500">Dashboards</span>
          <span>/</span>
          <span className="text-white">Home</span>
          <div className="flex-1"></div>

        </div>

        {/* Video List */}
        <div className="px-10">
          <h1 className="text-lg font-semibold mb-4 mt-4">Video List</h1>

          {/* Actions */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={openAddModal} className="bg-[#232329] rounded-lg px-3 py-1 text-lg">+</button>
            <button className="bg-[#232329] rounded-lg px-3 py-1">
              <span className="text-gray-400">⏷</span>
            </button>
            <button className="bg-[#232329] rounded-lg px-3 py-1">
              <span className="text-gray-400">≡</span>
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={deleteSelected}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 text-sm rounded ml-2"
              >
                Delete Selected
              </button>
            )}
            <div className="flex-1"></div>
            <div className="relative">
              <input
                className="bg-[#232329] rounded px-4 py-1 text-sm placeholder-gray-500 focus:outline-none"
                placeholder="Search"
                style={{ width: 180 }}
              />
              <span className="absolute right-3 top-1.5 text-gray-500"></span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#232329] rounded-lg overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="px-4 py-3 text-left font-normal">
                    <input 
                      type="checkbox" 
                      className="accent-blue-500"
                      checked={selectedIds.length === videos.length && videos.length > 0}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(videos.map(v => v.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-normal">Video ID</th>
                  <th className="px-4 py-3 text-left font-normal">Video Title</th>
                  <th className="px-4 py-3 text-left font-normal">Recommendation Level</th>
                  <th className="px-4 py-3 text-left font-normal">Date</th>
                  <th className="px-4 py-3 text-left font-normal">Upload Status</th>
                  <th className="px-4 py-3 text-left font-normal">Tags</th>
                  <th className="px-4 py-3 text-left font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6">
                      Loading...
                    </td>
                  </tr>
                ) : videos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-400">
                      No videos found.
                    </td>
                  </tr>
                ) : (
                  videos.map((v, idx) => {
                    const { status, date } = statusList[idx % statusList.length];
                    return (
                      <tr
                        key={v.id}
                        className={`border-b border-[#2c2c34] hover:bg-[#23232b]`}
                      >
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            className="accent-blue-500" 
                            checked={selectedIds.includes(v.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedIds(ids => [...ids, v.id]);
                              } else {
                                setSelectedIds(ids => ids.filter(id => id !== v.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">{`#CM98${(idx + 1).toString().padStart(2, '0')}`}</td>
                        <td className="px-4 py-3">{v.title}</td>
                        <td className="px-4 py-3">
                          {getRecommendationLevel(v, idx)}
                          {idx === 4 && (
                            <span className="ml-2 text-gray-400 text-xs"></span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-2">
                          <span className="text-gray-400"></span>
                          {date}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-2 ${statusStyles[status]}`}>
                            <span className={`w-2 h-2 rounded-full ${statusDot[status]}`}></span>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <TagsList videoId={v.id} /> 
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEditModal(v)}
                            className="text-blue-400 hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-end mt-4 gap-2 text-gray-400 items-center">
            <button className="px-3 py-1 rounded bg-[#232329]">{'<'}</button>
            <button className="px-3 py-1 rounded bg-[#232329] text-white">Button</button>
            <button className="px-3 py-1 rounded bg-[#232329]">2</button>
            <button className="px-3 py-1 rounded bg-[#232329]">3</button>
            <button className="px-3 py-1 rounded bg-[#232329]">4</button>
            <button className="px-3 py-1 rounded bg-[#232329]">5</button>
            <button className="px-3 py-1 rounded bg-[#232329]">{'>'}</button>
          </div>
        </div>

        {/* Modal (Add/Edit) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#232329] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </h2>
              {errorMsg && (
                <div className="mb-4 text-red-400">{errorMsg}</div>
              )}
              <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className="mb-4">
                  <label className="block mb-2">Video Title</label>
                  <input
                    className="w-full p-2 text-black rounded-md"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </div>
                {/* Section */}
                <div className="mb-4">
                  <label className="block mb-2">Section Title</label>
                  <input
                    className="w-full p-2 text-black rounded-md"
                    value={form.sectionTitle}
                    onChange={(e) =>
                      setForm({ ...form, sectionTitle: e.target.value })
                    }
                  />
                </div>
                {/* Description */}
                <div className="mb-4">
                  <label className="block mb-2">Description</label>
                  <textarea
                    className="w-full p-2 text-black rounded-md"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                {/* YouTube ID */}
                <div className="mb-4">
                  <label className="block mb-2">YouTube ID</label>
                  <input
                    className="w-full p-2 text-black rounded-md"
                    value={form.videoYTId}
                    onChange={(e) =>
                      setForm({ ...form, videoYTId: e.target.value })
                    }
                    required
                  />
                </div>
                {/* Watched */}
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={form.watched_fully}
                    onChange={() =>
                      setForm({
                        ...form,
                        watched_fully: !form.watched_fully,
                      })
                    }
                    className="mr-2"
                  />
                  <label>Watched Fully</label>
                </div>
                {/* Skill */}
                <div className="mb-4">
                  <label className="block mb-2">Skill</label>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    className="w-full p-2 text-black rounded-md"
                    value={form.skill}
                    onChange={(e) =>
                      setForm({ ...form, skill: Number(e.target.value) })
                    }
                  />
                </div>
                {/* Tags */}
                <div className="mb-4">
                  <label className="block mb-2">Tags</label>
                  <div className="flex mb-2">
                    <input
                      className="flex-1 p-2 text-black rounded-md"
                      placeholder="Enter a tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(), handleAddTag())
                      }
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="bg-[#27272f] px-2 py-1 rounded-md flex items-center"
                      >
                        {t}
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="ml-2 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {/* Sections */}
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Assign to Sections:</h2>
                  <div className="max-h-40 overflow-y-auto bg-[#18181b] p-2 rounded-md">
                    {sections.map((sec) => (
                      <label
                        key={sec.id}
                        className="flex items-center mb-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(sec.id)}
                          onChange={() => toggleSection(sec.id)}
                          className="mr-2"
                        />
                        <span>{sec.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#18181b] text-white rounded-md hover:bg-[#27272f]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : editingVideo ? 'Save' : 'Add Video'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
