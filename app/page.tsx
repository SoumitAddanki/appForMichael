'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


type Video = {
  id: string
  title: string
  description: string
  videoYTId: string
  sectionTitle: string
  watched_fully: boolean
  skill: number
  // OTT, APP, ARG, PUTT removed
}

type Section = {
  id: string
  name: string
  description: string
  skill: string
}

type Tag = {
  tag: string
}

function TagsList({ videoId }: { videoId: string }) {
  const [videoTags, setVideoTags] = useState<Tag[]>([]);
  
  useEffect(() => {
    async function fetchTags() {
      const { data } = await supabase
        .from('tags')
        .select('tag')
        .eq('videoId', videoId);
      
      if (data) setVideoTags(data);
    }
    
    fetchTags();
  }, [videoId]);
  
  return (
    <div className="flex flex-wrap gap-1">
      {videoTags.map(tag => (
        <span key={tag.tag} className="bg-[#27272f] px-2 py-0.5 text-xs rounded">
          {tag.tag}
        </span>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [newVideo, setNewVideo] = useState<Omit<Video, 'id'>>({
    title: '',
    description: '',
    videoYTId: '',
    sectionTitle: '',
    watched_fully: false,
    skill: 1,
  })

  // Handle adding a tag
  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Fetch videos
  const fetchVideos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('id', { ascending: false })
    if (!error && data) setVideos(data)
    setLoading(false)
  }

  // Fetch sections
  const fetchSections = async () => {
    const { data, error } = await supabase.from('sections').select('*')
    if (!error && data) setSections(data)
  }

  useEffect(() => {
    fetchVideos()
    fetchSections()
  }, [])

  // Handle section checkbox
  const handleSectionCheckbox = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(sectionId => sectionId !== id) : [...prev, id]
    )
  }

  // Add video handler
  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)
    try {
      // Insert video
      const { data: video, error } = await supabase
        .from('videos')
        .insert([newVideo])
        .select()
        .single()

      if (error) {
        setErrorMsg(error.message)
        setIsSaving(false)
        return
      }

      // Insert tags if any
      if (tags.length > 0 && video) {
        const tagsToInsert = tags.map(tag => ({
          videoId: video.id,
          tag: tag
        }));
        
        const { error: tagError } = await supabase
          .from('tags')
          .insert(tagsToInsert);
          
        if (tagError) {
          setErrorMsg('Video created, but failed to add tags.');
          console.error('Tag error:', tagError);
        }
      }

      // Link to sections if any selected
      if (video && selectedSections.length > 0) {
        const relations = selectedSections.map(sectionId => ({
          section_id: sectionId,
          video_id: video.id,
        }))
        const { error: relError } = await supabase
          .from('section_videos')
          .insert(relations)
        if (relError) {
          setErrorMsg('Video created, but failed to link to sections.')
        }
      }

      // Success: refresh, reset, close modal
      await fetchVideos()
      setIsModalOpen(false)
      setNewVideo({
        title: '',
        description: '',
        videoYTId: '',
        sectionTitle: '',
        watched_fully: false,
        skill: 1,
      })
      setSelectedSections([])
      setTags([])
    } catch (err: any) {
      setErrorMsg('Unexpected error: ' + (err?.message || String(err)))
    }
    setIsSaving(false)
  }

  return (
    <div className="flex min-h-screen bg-[#18181b] text-white">
      {/* Sidebar (simplified) */}
      <aside className="w-64 bg-[#232329] p-6 flex flex-col">
        <div className="mb-8 font-bold text-lg">Michael Dutro</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Video List</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <span className="mr-2 text-xl">+</span> Add Video
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#232329] rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#232329] text-gray-400">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Section Title</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">YouTube ID</th>
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="px-4 py-3 text-left">Watched</th>
                <th className="px-4 py-3 text-left">Skill</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6">Loading...</td>
                </tr>
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-400">
                    No videos found. Click the + button to add one.
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id} className="border-b border-[#2c2c34] hover:bg-[#23232b]">
                    <td className="px-4 py-3">{video.id}</td>
                    <td className="px-4 py-3">{video.title}</td>
                    <td className="px-4 py-3">{video.sectionTitle}</td>
                    <td className="px-4 py-3">{video.description}</td>
                    <td className="px-4 py-3">{video.videoYTId}</td>
                    <td className="px-4 py-3">
                      <TagsList videoId={video.id} />
                    </td>
                    <td className="px-4 py-3">{video.watched_fully ? '✅' : ''}</td>
                    <td className="px-4 py-3">{video.skill}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Video Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#232329] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New Video</h2>
              {errorMsg && (
                <div className="mb-4 text-red-400">{errorMsg}</div>
              )}
              <form onSubmit={addVideo}>
                <div className="mb-4">
                  <label className="block mb-2">Video Title</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="Video Title"
                    value={newVideo.title}
                    onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Section Title</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="Section Title"
                    value={newVideo.sectionTitle}
                    onChange={e => setNewVideo({ ...newVideo, sectionTitle: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Description</label>
                  <textarea
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="Description"
                    value={newVideo.description}
                    onChange={e => setNewVideo({ ...newVideo, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">YouTube Video ID</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    placeholder="YouTube Video ID"
                    value={newVideo.videoYTId}
                    onChange={e => setNewVideo({ ...newVideo, videoYTId: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Watched Fully</label>
                  <input
                    type="checkbox"
                    checked={newVideo.watched_fully}
                    onChange={() => setNewVideo({ ...newVideo, watched_fully: !newVideo.watched_fully })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Skill</label>
                  <input
                    className="block w-full mb-2 p-2 text-black rounded-md"
                    type="number"
                    min={1}
                    max={3}
                    value={newVideo.skill}
                    onChange={e => setNewVideo({ ...newVideo, skill: parseInt(e.target.value) })}
                  />
                </div>
                
                {/* Tags Input Section */}
                <div className="mb-4">
                  <label className="block mb-2">Tags</label>
                  <div className="flex items-center mb-2">
                    <input
                      className="flex-1 p-2 text-black rounded-md"
                      placeholder="Enter a tag"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button
                      type="button"
                      className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                      onClick={handleAddTag}
                    >
                      Add
                    </button>
                  </div>
                  
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <span key={tag} className="bg-[#27272f] px-2 py-1 rounded-md flex items-center">
                          {tag}
                          <button
                            type="button"
                            className="ml-2 text-gray-400 hover:text-white"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Assign to Sections:</h2>
                  <div className="max-h-40 overflow-y-auto bg-[#18181b] p-2 rounded-md">
                    {sections.map(section => (
                      <label key={section.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.id)}
                          onChange={() => handleSectionCheckbox(section.id)}
                          className="mr-2"
                        />
                        <span>{section.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
                    {isSaving ? 'Adding...' : 'Add Video'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}