import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { extractApiErrorMessage } from './knowledgeBaseTypes';
import { AiPrompt, emptyPromptForm, PromptForm } from './promptLibraryTypes';

export const usePromptLibrary = () => {
    const [prompts, setPrompts] = useState<AiPrompt[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<PromptForm>(emptyPromptForm());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await $apiPrivate.get<AiPrompt[]>('/ai-email/prompts');
            setPrompts(response.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const startEdit = (prompt: AiPrompt) => {
        setEditingId(prompt.id);
        setForm({ slot: prompt.slot, name: prompt.name, content: prompt.content, tags: prompt.tags.join(', ') });
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyPromptForm(form.slot));
    };

    const save = async () => {
        if (!form.name.trim() || !form.content.trim()) return toast.error('Укажите название и текст промпта');
        setSaving(true);
        try {
            if (editingId) {
                await $apiPrivate.patch(`/ai-email/prompts/${editingId}`, { name: form.name, content: form.content, tags: form.tags });
                toast.success('Промпт сохранён');
            } else {
                await $apiPrivate.post('/ai-email/prompts', { slot: form.slot, name: form.name, content: form.content, tags: form.tags });
                toast.success('Промпт создан');
            }
            resetForm();
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось сохранить промпт'));
        } finally {
            setSaving(false);
        }
    };

    const activate = async (id: number) => {
        try {
            await $apiPrivate.post(`/ai-email/prompts/${id}/activate`);
            toast.success('Промпт активирован — теперь используется и в реальных письмах');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось активировать промпт'));
        }
    };

    const remove = async (id: number) => {
        if (!window.confirm('Удалить промпт?')) return;
        try {
            await $apiPrivate.delete(`/ai-email/prompts/${id}`);
            toast.success('Промпт удалён');
            if (editingId === id) resetForm();
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось удалить промпт'));
        }
    };

    return { prompts, loading, form, setForm, editingId, saving, startEdit, resetForm, save, activate, remove };
};
