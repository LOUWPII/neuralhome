-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create palaces table
create table public.palaces (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create concepts table
create table public.concepts (
    id uuid default uuid_generate_v4() primary key,
    palace_id uuid references public.palaces(id) on delete cascade not null,
    label text not null,
    position_x float not null,
    position_y float not null,
    position_z float not null,
    status float default 0.0 not null,
    context text not null,
    feynman_summary text,
    model_type text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.palaces enable row level security;
alter table public.concepts enable row level security;

-- Policies for palaces
create policy "Users can view their own palaces."
    on public.palaces for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own palaces."
    on public.palaces for insert
    with check ( auth.uid() = user_id );

create policy "Users can update their own palaces."
    on public.palaces for update
    using ( auth.uid() = user_id );

create policy "Users can delete their own palaces."
    on public.palaces for delete
    using ( auth.uid() = user_id );

-- Policies for concepts
create policy "Users can view concepts of their palaces."
    on public.concepts for select
    using ( exists (select 1 from public.palaces where palaces.id = concepts.palace_id and palaces.user_id = auth.uid()) );

create policy "Users can insert concepts into their palaces."
    on public.concepts for insert
    with check ( exists (select 1 from public.palaces where palaces.id = concepts.palace_id and palaces.user_id = auth.uid()) );

create policy "Users can update concepts of their palaces."
    on public.concepts for update
    using ( exists (select 1 from public.palaces where palaces.id = concepts.palace_id and palaces.user_id = auth.uid()) );

create policy "Users can delete concepts of their palaces."
    on public.concepts for delete
    using ( exists (select 1 from public.palaces where palaces.id = concepts.palace_id and palaces.user_id = auth.uid()) );

-- Indexes for performance
create index index_palaces_user_id on public.palaces(user_id);
create index index_concepts_palace_id on public.concepts(palace_id);
